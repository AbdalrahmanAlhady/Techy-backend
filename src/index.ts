import express from "express";
import "dotenv/config";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { UserResolver } from "./resolver/UserResolver";
import { appDataSource } from "../ormconfig";
import cookieParser from "cookie-parser";


(async () => {
  const app: any = express();
  appDataSource.initialize().then(() => {
    console.log("DB has been initialized!");
  });
  app.use(cookieParser());
  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [UserResolver],
    }),
    context: ({ req, res }) => ({ req, res }), // Provide context
  });
  await apolloServer.start();
  apolloServer.applyMiddleware({ app });
  console.log(process.env.PORT);

  app.listen(process.env.PORT, () =>
    console.log("Server started on port 3000")
  );
})();
