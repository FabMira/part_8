const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const { v1: uuid } = require("uuid");
const { GraphQLError } = require("graphql");

const mongoose = require("mongoose");
mongoose.set("strictQuery", false);
const Book = require("./models/book_schema");
const Author = require("./models/author_schema");

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

  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(author: String, genre: String): [Book!]!
    allAuthors: [Author!]!
  }

  type Mutation {
    addBook(
      title: String!
      author: String!
      published: Int!
      genres: [String!]!
    ): Book!
    editAuthor( name: String!, setBornTo: Int! ): Author
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
  },
  Mutation: {
    addBook: async (root, args) => {
      if (args.title.length < 3) {
        throw new GraphQLError("Book title must be at least 2 letters", {
          extensions: { code: "SHORT_BOOK_NAME" },
        });
      }
      let author = await Author.findOne({ name: args.author });
      if (!author) {
        if (args.author.length < 5) {
          console.log(args.author);
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
      return book.populate("author");
    },
    editAuthor: async (root, args) => {
      const author = await Author.findOne({ name: args.name });
      if (!author) {
        return null;
      }
      author.born = args.setBornTo;
      try {
        await author.save();
      } catch (error) {
        throw new Error(`Updating author failed: ${error.message}`);
      }
      return {
        name: author.name,
        born: author.born,
        bookCount: await Book.countDocuments({ author: author._id }),
      };
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

startStandaloneServer(server, {
  listen: { port: 4000 },
}).then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
