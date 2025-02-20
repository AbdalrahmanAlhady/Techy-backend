import { Mutation, Resolver, Arg } from "type-graphql";
import "reflect-metadata"; // Ensure you have this import for TypeGraphQL if it's not globally imported
import Stripe from "stripe"; // Import your configured stripe instance

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY!,
  {
    apiVersion: "2025-01-27.acacia",
  }
);

@Resolver()
export class PaymentResolver {
  @Mutation(() => String) // Assuming the client_secret is a string. Adjust if needed.
  async createPaymentIntent(
    @Arg("amount") amount: number,
    @Arg("currency") currency: string
  ): Promise<string> {
    try {
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        payment_method_types: ["card"],
      });
      console.log(paymentIntent);
      return paymentIntent.client_secret||"";
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Payment failed"
      );
    }
  }
}
