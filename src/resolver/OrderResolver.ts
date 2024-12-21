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
import { OrderItemInput } from "../types/OrderItemInput";
import { OrderItemResolver } from "./OrderItemResolver";
import { Console } from "console";
import { appDataSource } from "../../ormconfig";

@Resolver(Order)
export class OrderResolver {
  @Query(() => [Order])
  async orders(
    @Arg("id", { nullable: true })  id: string,
    @Arg("options", () => QueryOptionsInput, { nullable: true })
    options?: QueryOptionsInput
  ): Promise<Order[]> {
    if (id) {
      return Order.find({ where: { id }, relations: ["user", "orderItems"] });
    }
    const parsedFilters = options?.filters ? JSON.parse(options.filters) : {};

    const qb = Order.createQueryBuilder("Order");

    const queryOptions = createQueryOptions(qb, {
      page: options?.page,
      limit: options?.limit,
      sortField: options?.sortField,
      sortOrder: options?.sortOrder,
      filters: parsedFilters,
      searchField: options?.searchField,
      searchTerm: options?.searchTerm,
      relations: options?.relations || ["user", "orderItems"], // Default relation
    });

    return queryOptions.getMany();
  }

  @Mutation(() => Order)
  // @UseMiddleware(isAuthunticated)
  async createOrder(
    @Arg("totalAmount") totalAmount: number,
    @Arg("deliveryFee") deliveryFee: number,
    @Arg("userId") userId: string,
    @Arg("orderItems", () => [OrderItemInput]) orderItems: OrderItemInput[]
  ): Promise<Order> {
    return await appDataSource.manager.transaction(
      async (transactionalEntityManager) => {
        try {
          const user = await transactionalEntityManager.findOne(User, {
            where: { id: userId },
          });
          if (!user) throw new Error("admin_id not found");

          const order = transactionalEntityManager.create(Order, {
            totalAmount,
            user,
            deliveryFee,
          });
          await transactionalEntityManager.save(order);

          let orderItemResolver = new OrderItemResolver();
          await Promise.all(
            orderItems.map((orderItem) =>
              orderItemResolver.createOrderItem(
                orderItem.quantity,
                orderItem.unitPrice,
                orderItem.totalPrice,
                order.id,
                orderItem.productId,
                transactionalEntityManager
              )
            )
          );

          const savedOrder = await transactionalEntityManager.findOne(Order, {
            where: { id: order.id },
            relations: ["orderItems", "user"],
          });

          if (!savedOrder) throw new Error("Order not found after saving");

          return savedOrder;
        } catch (error: any) {
          console.log(error);
          throw new Error(error.message);
        }
      }
    );
  }
  @Mutation(() => Order || null || undefined)
  // @UseMiddleware(isAuthunticated)
  // @Authorized(UserRole.ADMIN)
  async updateOrder(
    @Arg("id")  id: string,
    @Arg("orderStatus", { nullable: true }) orderStatus: OrderStatus,
    @Arg("totalAmount", { nullable: true }) totalAmount: number,
    @Arg("deliveryFee", { nullable: true }) deliveryFee: number
  ): Promise<Order | null | undefined> {
    return await appDataSource.manager.transaction(
      async (transactionalEntityManager) => {
        if (deliveryFee) {
          let order = await transactionalEntityManager.findOne(Order, {
            where: { id },
            relations: ["orderItems"],
          });
          if (order) {
            order.deliveryFee = deliveryFee;
            await transactionalEntityManager.save(order);
            return await order.updateTotalAmount(
              order.id,
              transactionalEntityManager
            );
          }
        } else if (orderStatus || totalAmount) {
          const orderResult = await transactionalEntityManager.update(
            Order,
            { id },
            { totalAmount, orderStatus }
          );

          if (orderResult.affected === 0) {
            throw new Error("update failed");
          }
          return await transactionalEntityManager.findOne(Order, {
            where: { id },
            relations: ["orderItems"],
          });
        }
      }
    );
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuthunticated)
  @Authorized(UserRole.ADMIN)
  async deleteOrder(@Arg("id")  id: string): Promise<boolean> {
    const result = await Order.delete({ id });
    return result.affected! > 0;
  }
}
