/* eslint-disable react/prop-types */
import { useQuery } from "@apollo/client";
import { ALL_BOOKS, USER } from "../queries/queries";
import { useEffect } from "react";

const Books = (props) => {
  const loggedUser = useQuery(USER, {
    onError: (error) => {
      props.setMessage(error.message);
      setTimeout(() => {
        props.setMessage(null);
      }, 5000);
    },
  });
  const result = useQuery(ALL_BOOKS, {
    onError: (error) => {
      props.setMessage(error.message);
      setTimeout(() => {
        props.setMessage(null);
      }, 5000);
    },
  });

  useEffect(() => {
    const newToken = localStorage.getItem("booklist-user-token");
    if (newToken !== props.token) {
      loggedUser.refetch();
    } else if (props.token !== null && loggedUser.data.me === null) {
      loggedUser.refetch();
    }
  }, [loggedUser, props.token]);

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

  if (!loggedUser.data?.me) {
    return <div>por favor inicia sesion</div>;
  }

  const userFavoriteGenre = loggedUser.data.me.favoriteGenre;
  const books = result.data.allBooks;
  const filteredBooks = books.filter((book) =>
    book.genres.includes(userFavoriteGenre)
  );

  return (
    <div>
      <h2>recommendations</h2>
      <p>
        books in your favorite genre{" "}
        <span style={{ fontWeight: "bold" }}>{userFavoriteGenre}</span>
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
    </div>
  );
};

export default Books;
