import {
  Resolver,
  Query,
  Mutation,
  Arg,
  UseMiddleware,
  Authorized,
} from "type-graphql";
import { User, UserRole } from "../entity/User";
import { isAuthunticated } from "../middleware/isAuthunticated";
import { QueryOptionsInput } from "../types/QueryOptionsInput";
import { createQueryOptions } from "../utils/apiUtils";
import { Order, OrderStatus } from "../entity/Order";
import { OrderItem } from "../entity/OrderItem";
import { Product } from "../entity/Product";
import { appDataSource } from "../../ormconfig";
import { EntityManager } from "typeorm";

@Resolver(OrderItem)
export class OrderItemResolver {
  @Query(() => [OrderItem])
  async orderItems(
    @Arg("id", { nullable: true })  id: string,
    @Arg("options", () => QueryOptionsInput, { nullable: true })
    options?: QueryOptionsInput
  ): Promise<OrderItem[]> {
    if (id) {
      return OrderItem.find({ where: { id }, relations: ["order", "product"] });
    }
    const parsedFilters = options?.filters ? JSON.parse(options.filters) : {};

    const qb = OrderItem.createQueryBuilder("OrderItem");

    const queryOptions = createQueryOptions(qb, {
      page: options?.page,
      limit: options?.limit,
      sortField: options?.sortField,
      sortOrder: options?.sortOrder,
      filters: parsedFilters,
      searchField: options?.searchField,
      searchTerm: options?.searchTerm,
      relations: options?.relations || ["order", "product"], // Default relation
    });

    return queryOptions.getMany();
  }

  @Mutation(() => OrderItem)
  // @UseMiddleware(isAuthunticated)
  // @Authorized(UserRole.ADMIN)
  async createOrderItem(
    @Arg("quantity") quantity: number,
    @Arg("unitPrice") unitPrice: number,
    @Arg("totalPrice") totalPrice: number,
    @Arg("orderId") orderId: string,
    @Arg("productId") productId: string,
    transactionalEntityManager?: EntityManager
  ): Promise<OrderItem | null> {
    const executeTransaction = async (manager: EntityManager) => {
      try {
        const order = await manager.findOne(Order, {
          where: { id: orderId },
          relations: ["orderItems"],
        });
        if (!order) throw new Error("Order not found");
  
        const product = await manager.findOne(Product, {
          where: { id: productId },
        });
        if (!product) throw new Error("Product not found");
  
        const orderItem = manager.create(OrderItem, {
          quantity,
          unitPrice,
          totalPrice,
          order,
          product,
        });
  
        await manager.save(orderItem);
  
        await order.updateTotalAmount(orderId, manager);
  
        return manager.findOne(OrderItem, {
          where: { id: orderItem.id },
          relations: ["order", "product"],
        });
      } catch (error: any) {
        console.error("Error creating order item:", error);
        throw new Error(error.message);
      }
    };
  
    if (transactionalEntityManager) {
      // Use the provided transaction manager
      return await executeTransaction(transactionalEntityManager);
    } else {
      // Start a new transaction
      return await appDataSource.manager.transaction(executeTransaction);
    }
  }

  @Mutation(() => OrderItem || null)
  // @UseMiddleware(isAuthunticated)
  // @Authorized(UserRole.ADMIN)
  async updateOrderItem(
    @Arg("id")  id: string,
    @Arg("quantity", { nullable: true }) quantity?: number,
    @Arg("unitPrice", { nullable: true }) unitPrice?: number,
    @Arg("totalPrice", { nullable: true }) totalPrice?: number
  ): Promise<OrderItem | null> {
    return await appDataSource.manager.transaction(
      async (transactionalEntityManager) => {
        const orderItem = await transactionalEntityManager.update(
          OrderItem,
          { id },
          { quantity, unitPrice, totalPrice }
        );
        if (orderItem.affected === 0) {
          throw new Error("update failed");
        } else {
          let updatedOrderItem = await transactionalEntityManager.findOne(
            OrderItem,
            {
              where: { id },
              relations: ["order", "product"],
            }
          );
          if (!totalPrice && updatedOrderItem) {
            await updatedOrderItem.updateTotalPrice(
              id,
              transactionalEntityManager
            );
          }
          const order = await transactionalEntityManager.findOne(Order, {
            where: { id: updatedOrderItem!.order!.id },
            relations: ["orderItems"],
          });
          if (order) {
            await order.updateTotalAmount(order.id, transactionalEntityManager);
          }
        }
        return await transactionalEntityManager.findOne(OrderItem, {
          where: { id },
          relations: ["order", "product"],
        });
      }
    );
  }

  @Mutation(() => Boolean)
  // @UseMiddleware(isAuthunticated)
  // @Authorized(UserRole.ADMIN)
  async deleteOrderItem(@Arg("id")  id: string): Promise<boolean> {
    return await appDataSource.manager.transaction(
      async (transactionalEntityManager) => {
        const orderItem = await transactionalEntityManager.findOne(OrderItem, {
          where: { id },
          relations: ["order", "product"],
        });
        if (!orderItem) throw new Error("Order item not found");

        const result = await transactionalEntityManager.delete(OrderItem, {
          id,
        });

        const order = await transactionalEntityManager.findOne(Order, {
          where: { id: orderItem!.order!.id },
          relations: ["orderItems"],
        });

        if (order) {
          await order.updateTotalAmount(order.id, transactionalEntityManager);
        }

        return result.affected! > 0;
      }
    );
  }
}
