import express from "express";
import "dotenv/config";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { UserResolver } from "./resolver/UserResolver";
import { appDataSource } from "../ormconfig";
import cookieParser from "cookie-parser";
import { BrandResolver } from "./resolver/BrandResolver";
import { CategoryResolver } from "./resolver/CategoryResolver";
import { ProductResolver } from "./resolver/ProductResolver";
import { isAuthorized } from "./middleware/isAuthorized";
import { OrderResolver } from "./resolver/OrderResolver";
import { OrderItemResolver } from "./resolver/OrderItemResolver";

(async () => {
  const app: any = express();
  appDataSource.initialize().then(() => {
    console.log("DB has been initialized!");
  });
  app.use(cookieParser());
  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [
        ProductResolver,
        BrandResolver,
        CategoryResolver,
        UserResolver,
        OrderResolver,
        OrderItemResolver
      ],
      authChecker: isAuthorized,
    }),
    context: ({ req, res }) => ({ req, res }), // Provide context
  });
  await apolloServer.start();
  apolloServer.applyMiddleware({ app });

  app.listen(process.env.PORT, () =>
    console.log("Server started on port 3000")
  );
})();
