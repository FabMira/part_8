/* eslint-disable react/prop-types */
import { useQuery } from "@apollo/client";
import { ALL_BOOKS } from "../queries/queries";
import { useState } from "react";

const Books = (props) => {
  const [genre, setGenre] = useState("all");
  const result = useQuery(ALL_BOOKS, {
    onError: (error) => {
      props.setMessage(error.message);
      setTimeout(() => {
        props.setMessage(null);
      }, 5000);
    },
  });

  if (!props.show) {
    return null;
  }

  if (result.loading) {
    return (
      <div>
        <h2>Loading...</h2>
      </div>
    );
  }

  const books = result.data.allBooks;
  const genres = [...new Set(books.map((b) => b.genres).flat())];
  const filteredBooks =
    genre === "all"
      ? books
      : books.filter((book) => book.genres.includes(genre));

  return (
    <div>
      <h2>books</h2>
      <p>
        in genre <span style={{ fontWeight: "bold" }}>{genre}</span>
      </p>
      <table>
        <tbody>
          <tr>
            <th></th>
            <th>author</th>
            <th>published</th>
          </tr>
          {filteredBooks.map((a) => (
            <tr key={a.title}>
              <td>{a.title}</td>
              <td>{a.author.name}</td>
              <td>{a.published}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button style={{ marginRight: 10 }} onClick={() => setGenre("all")}>
        all
      </button>
      {genres.map((g) => (
        <button style={{ marginRight: 10 }} key={g} onClick={() => setGenre(g)}>
          {g}
        </button>
      ))}
    </div>
  );
};

export default Books;
