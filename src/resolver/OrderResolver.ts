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
import { OrderItemInput } from "../types/OrderItemInput";
import { OrderItemResolver } from "./OrderItemResolver";
import { Console } from "console";
import { appDataSource } from "../../ormconfig";
import { PaymentResolver } from "./PaymentResolver";

@Resolver(Order)
export class OrderResolver {
  @Query(() => Int)
  async ordersCount(
    @Arg("options", () => QueryOptionsInput, { nullable: true })
    options?: QueryOptionsInput
  ): Promise<number> {
    const qb = Order.createQueryBuilder("Order");
    const queryOptions = createQueryOptions(qb, {
      page: options?.page,
      limit: options?.limit,
      sortField: options?.sortField,
      sortOrder: options?.sortOrder,
      filters: options?.filters,
      searchField: options?.searchField,
      searchTerm: options?.searchTerm,
      relations: options?.relations || ["user", "orderItems"], // Default relation
    });
    return queryOptions.getCount();
  }
  @Query(() => [Order])
  @UseMiddleware(isAuthunticated)
  async orders(
    @Arg("id", { nullable: true }) id?: string,
    @Arg("options", () => QueryOptionsInput, { nullable: true })
    options?: QueryOptionsInput
  ): Promise<Order[]> {
    if (id) {
      return Order.find({
        where: { id },
        relations: options?.relations || [
          "user",
          "orderItems",
          "orderItems.product",
        ],
      });
    }
    const qb = Order.createQueryBuilder("Order");

    const queryOptions = createQueryOptions(qb, {
      page: options?.page,
      limit: options?.limit,
      sortField: options?.sortField,
      sortOrder: options?.sortOrder,
      filters: options?.filters,
      searchField: options?.searchField,
      searchTerm: options?.searchTerm,
      relations: options?.relations || ["user", "orderItems"],
    });
    queryOptions
      .leftJoinAndSelect("Order.orderItems", "OrderItem")
      .leftJoinAndSelect("OrderItem.product", "Product")
      .leftJoinAndSelect("Product.vendor", "Vendor");
    return queryOptions.getMany();
  }

  @Mutation(() => Order)
  @UseMiddleware(isAuthunticated)
  async createOrder(
    @Arg("address") address: string,
    @Arg("totalAmount") totalAmount: number,
    @Arg("deliveryFee") deliveryFee: number,
    @Arg("userId") userId: string,
    @Arg("orderItems", () => [OrderItemInput]) orderItems: OrderItemInput[],
    @Arg("stripePaymentId", { nullable: true }) stripePaymentId: string
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
            address,
            stripePaymentId,
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
  @UseMiddleware(isAuthunticated)
  @Authorized(UserRole.ADMIN)
  async updateOrder(
    @Arg("id") id: string,
    @Arg("orderStatus", { nullable: true }) orderStatus?: OrderStatus,
    @Arg("totalAmount", { nullable: true }) totalAmount?: number,
    @Arg("deliveryFee", { nullable: true }) deliveryFee?: number,
    @Arg("address", { nullable: true }) address?: string
  ): Promise<Order | null> {
    return await appDataSource.manager.transaction(
      async (transactionalEntityManager) => {
        // Fetch order once at the beginning
        let order = await transactionalEntityManager.findOne(Order, {
          where: { id },
          relations: ["user", "orderItems"],
        });

        if (!order) {
          throw new Error("Order not found");
        }

        let updateData: Partial<Order> = {};

        // Update deliveryFee & recalculate totalAmount if needed
        if (
          typeof deliveryFee !== "undefined" &&
          order.deliveryFee !== deliveryFee
        ) {
          order.deliveryFee = deliveryFee;
          await transactionalEntityManager.save(order);
          await order.updateTotalAmount(order.id, transactionalEntityManager);
        }

        // Prepare update fields
        if (typeof totalAmount !== "undefined")
          updateData.totalAmount = totalAmount;
        if (typeof orderStatus !== "undefined")
          updateData.orderStatus = orderStatus;
        if (typeof address !== "undefined") updateData.address = address;

        // Update only if necessary
        if (Object.keys(updateData).length > 0) {
          const orderResult = await transactionalEntityManager.update(
            Order,
            { id },
            updateData
          );

          if (orderResult.affected === 0) {
            throw new Error("Update failed");
          }
        }

        // Return the updated order
        return await transactionalEntityManager.findOne(Order, {
          where: { id },
          relations: ["orderItems", "user"],
        });
      }
    );
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuthunticated)
  @Authorized(UserRole.ADMIN || UserRole.BUYER)
  async deleteOrder(@Arg("id") id: string): Promise<boolean> {
    const result = await Order.delete({ id });
    return result.affected! > 0;
  }
}
