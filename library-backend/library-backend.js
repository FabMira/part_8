const { ApolloServer } = require("apollo-server-express");
const { ApolloServerPluginDrainHttpServer } = require("apollo-server-core");
const { createServer } = require("http");
const express = require("express");
const { WebSocketServer } = require("ws");
const { useServer } = require("graphql-ws/lib/use/ws");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const { v1: uuid } = require("uuid");
const { GraphQLError } = require("graphql");
const { PubSub } = require("graphql-subscriptions");

const mongoose = require("mongoose");
mongoose.set("strictQuery", false);
const Book = require("./models/book_schema");
const Author = require("./models/author_schema");
const User = require("./models/user_schema");
const jwt = require("jsonwebtoken");
const pubsub = new PubSub();
const cors = require("cors");

require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("connected to MongoDB");
  })
  .catch((error) => {
    console.log("error connection to MongoDB:", error.message);
  });

const typeDefs = `
  type Book {
    title: String!
    published: Int!
    author: Author!
    id: ID!
    genres: [String]!
  }

  type Author {
    name: String!
    born: Int
    bookCount: Int!
  }

  type User {
    username: String!
    favoriteGenre: String!
    id: ID!
  }

  type Token {
    value: String!
  }

  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(author: String, genre: String): [Book!]!
    allAuthors: [Author!]!
    me: User
  }

  type Mutation {
    addBook(
      title: String!
      author: String!
      published: Int!
      genres: [String!]!
    ): Book!
    editAuthor( name: String!, setBornTo: Int! ): Author
    createUser(
      username: String!
      favoriteGenre: String!
    ): User
    login(
      username: String!
      password: String!
    ): Token
  }

  type Subscription {
    bookAdded: Book!
  }
`;

const resolvers = {
  Query: {
    bookCount: async () => await Book.countDocuments(),
    authorCount: async () => await Author.countDocuments(),
    allBooks: async (root, args) => {
      let query = {};
      if (args.genre) {
        query.genres = { $in: [args.genre] };
      }
      const books = await Book.find(query).populate("author");
      return books.map((book) => ({
        title: book.title,
        published: book.published,
        author: book.author,
        id: book.id,
        genres: book.genres,
      }));
    },
    allAuthors: async () => {
      const authors = await Author.find({});
      const books = await Book.find({});
      return Promise.all(
        authors.map(async (author) => ({
          name: author.name,
          born: author.born,
          bookCount: await Book.countDocuments({ author: author._id }),
        }))
      );
    },
    me: (root, args, context) => {
      return context.currentUser;
    },
  },
  Mutation: {
    addBook: async (root, args, context) => {
      const currentUser = context.currentUser;
      if (!currentUser) {
        throw new GraphQLError("not authenticated", {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }
      if (args.title.length < 3) {
        throw new GraphQLError("Book title must be at least 2 letters", {
          extensions: { code: "SHORT_BOOK_NAME" },
        });
      }
      let author = await Author.findOne({ name: args.author });
      if (!author) {
        if (args.author.length < 5) {
          throw new GraphQLError("Author name must be longer than 4 letters", {
            extensions: { code: "SHORT_AUTHOR_NAME" },
          });
        }
        author = new Author({ name: args.author });
        try {
          await author.save();
        } catch (error) {
          throw new GraphQLError("Saving new author failed", {
            extensions: { code: "AUTHOR_SAVING_FAILURE" },
          });
        }
      }
      const book = new Book({
        title: args.title,
        published: args.published,
        author: author._id,
        genres: args.genres,
      });
      try {
        await book.save();
      } catch (error) {
        throw new GraphQLError("Saving book failed", {
          extensions: { code: "BOOK_SAVING_FAILURE" },
        });
      }
      pubsub.publish("BOOK_ADDED", { bookAdded: book.populate("author") });
      return book.populate("author");
    },
    editAuthor: async (root, args, context) => {
      const currentUser = context.currentUser;
      if (!currentUser) {
        throw new GraphQLError("not authenticated", {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }
      const author = await Author.findOne({ name: args.name });
      if (!author) {
        return null;
      }
      author.born = args.setBornTo;
      try {
        await author.save();
      } catch (error) {
        throw new GraphQLError("Updating author failed", {
          extensions: {
            code: "FAIL_AUTHOR_UPDATE",
          },
        });
      }
      return {
        name: author.name,
        born: author.born,
        bookCount: await Book.countDocuments({ author: author._id }),
      };
    },
    createUser: async (root, args) => {
      const user = new User({
        username: args.username,
        favoriteGenre: args.favoriteGenre,
      });
      return user.save().catch((error) => {
        throw new GraphQLError("Creating the user failed", {
          extensions: {
            code: "BAD_USER_INPUT",
            invalidArgs: args.name,
            error,
          },
        });
      });
    },
    login: async (root, args) => {
      const user = await User.findOne({ username: args.username });
      if (!user || args.password !== "secret") {
        throw new GraphQLError("wrong credentials", {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }
      const userForToken = {
        username: user.username,
        id: user._id,
      };
      return { value: jwt.sign(userForToken, process.env.JWT_SECRET) };
    },
  },
  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterator(["BOOK_ADDED"]),
    },
  },
};

const schema = makeExecutableSchema({ typeDefs, resolvers });

const app = express();

app.use(
  cors({
    origin: "*", // Cambia a tu origen del frontend
    credentials: true, // Permite enviar cookies o encabezados de autenticación
    methods: ["GET", "POST", "OPTIONS"], // Métodos permitidos
    allowedHeaders: ["Content-Type", "Authorization"], // Encabezados permitidos
  })
);

const httpServer = createServer(app);

const wsServer = new WebSocketServer({
  server: httpServer,
  path: "/graphql",
  subprotocol: "graphql-ws",
});

useServer(
  {
    schema,
    context: async (ctx) => {
      const { connectionParams } = ctx;
      if (connectionParams?.authorization) {
        const token = connectionParams.authorization.replace("Bearer ", "");
        try {
          const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
          const currentUser = await User.findById(decodedToken.id);
          return { currentUser };
        } catch (error) {
          console.error("WebSocket context - auth error:", error.message);
          return {};
        }
      }
      return {};
    },
  },
  wsServer
);

const server = new ApolloServer({
  schema,
  context: async ({ req }) => {
    // Manejo del contexto para solicitudes HTTP
    const auth = req ? req.headers.authorization : null;
    if (auth && auth.startsWith("Bearer ")) {
      try {
        const decodedToken = jwt.verify(
          auth.substring(7),
          process.env.JWT_SECRET
        );
        const currentUser = await User.findById(decodedToken.id);
        return { currentUser };
      } catch (error) {
        console.error("Error verifying token:", error);
        return {};
      }
    }
    return {};
  },
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    {
      serverWillStart() {
        return {
          drainServer() {
            wsServer.close();
          },
        };
      },
    },
  ],
});

const PORT = 4000;
server.start().then(() => {
  server.applyMiddleware({ app, path: "/graphql" });
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(
      `🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`
    );
    console.log(
      `🚀 Subscriptions ready at ws://localhost:${PORT}${server.graphqlPath}`
    );
  });
});
