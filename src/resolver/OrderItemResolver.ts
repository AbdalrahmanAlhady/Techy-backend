import {
  Resolver,
  Query,
  Mutation,
  Arg,
  UseMiddleware,
  Authorized,
  Int,
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
import { ProductResolver } from "./ProductResolver";

@Resolver(OrderItem)
export class OrderItemResolver {
  @Query(() => Int)
  @UseMiddleware(isAuthunticated)
  async OrderItemsCount(
    @Arg("options", () => QueryOptionsInput, { nullable: true })
    options?: QueryOptionsInput,
    @Arg("orderId", { nullable: true }) orderId?: string
  ): Promise<number> {
    const qb = OrderItem.createQueryBuilder("OrderItem");
    const queryOptions = createQueryOptions(qb, {
      page: options?.page,
      limit: options?.limit,
      sortField: options?.sortField,
      sortOrder: options?.sortOrder,
      filters: options?.filters,
      searchField: options?.searchField,
      searchTerm: options?.searchTerm,
      relations: options?.relations || ["order", "product"], // Default relation
    });
    return queryOptions.getCount();
  }
  @Query(() => [OrderItem])
  @UseMiddleware(isAuthunticated)
  async orderItems(
    @Arg("orderItemId", { nullable: true }) orderItemId: string,
    @Arg("orderId", { nullable: true }) orderId: string,
    @Arg("vendorId", { nullable: true }) vendorId: string,
    @Arg("options", () => QueryOptionsInput, { nullable: true })
    options?: QueryOptionsInput
  ): Promise<OrderItem[]> {
    if (orderItemId) {
      return OrderItem.find({
        where: { id: orderItemId, order: { id: orderId } },
        relations: ["order", "product"],
      });
    }

    let qb = OrderItem.createQueryBuilder("OrderItem");
    if (vendorId) {
      qb = OrderItem.createQueryBuilder("OrderItem")
        .leftJoinAndSelect("OrderItem.product", "Product")
        .leftJoinAndSelect("Product.vendor", "Vendor");
      qb.andWhere("Vendor.id = :vendorId", { vendorId });
    }

    const queryOptions = createQueryOptions(qb, {
      page: options?.page,
      limit: options?.limit,
      sortField: options?.sortField,
      sortOrder: options?.sortOrder,
      filters: options?.filters,
      searchField: options?.searchField,
      searchTerm: options?.searchTerm,
      relations: options?.relations || ["order", "product"], // Default relation
    });
    if (orderId) {
      queryOptions.andWhere("OrderItem.orderId = :orderId", { orderId });
    }
    return queryOptions.getMany();
  }

  @Mutation(() => OrderItem)
  @UseMiddleware(isAuthunticated)
  @Authorized(UserRole.ADMIN || UserRole.BUYER)
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
        let productInvertoryUpdateResult = await manager.update(
          Product,
          product.id,
          {
            inventory: product.inventory - quantity,
          }
        );
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
  @UseMiddleware(isAuthunticated)
  @Authorized(UserRole.ADMIN)
  async updateOrderItem(
    @Arg("id") id: string,
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
  @UseMiddleware(isAuthunticated)
  @Authorized(UserRole.ADMIN)
  async deleteOrderItem(@Arg("id") id: string): Promise<boolean> {
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
