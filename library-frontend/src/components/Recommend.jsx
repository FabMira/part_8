/* eslint-disable react/prop-types */
import { useQuery } from "@apollo/client";
import { ALL_BOOKS, USER } from "../queries/queries";
import { useEffect, useState } from "react";

const Books = (props) => {
  const [favoriteGenre, setFavoriteGenre] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  const loggedUser = useQuery(USER, {
    skip: !props.token,
    onError: (error) => {
      props.setMessage(error.message);
      setTimeout(() => {
        props.setMessage(null);
      }, 5000);
    },
  });

  const result = useQuery(ALL_BOOKS, {
    variables: { author: null, genre: favoriteGenre },
    skip: !favoriteGenre,
    onError: (error) => {
      props.setMessage(error.message);
      setTimeout(() => {
        props.setMessage(null);
      }, 5000);
    },
  });

  useEffect(() => {
    if (loggedUser.data && !loggedUser.loading) {
      const userFavGenre = loggedUser.data.me.favoriteGenre;
      setFavoriteGenre(userFavGenre);
    }
    if (result.data && !result.loading) {
      const books = result.data.allBooks;
      setRecommendations(books);
    }
  }, [loggedUser.data, loggedUser.loading, result.data, result.loading]);

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

  return (
    <div>
      <h2>recommendations</h2>
      <p>
        books in your favorite genre{" "}
        <span style={{ fontWeight: "bold" }}>{favoriteGenre}</span>
      </p>
      <table>
        <tbody>
          <tr>
            <th></th>
            <th>author</th>
            <th>published</th>
          </tr>
          {recommendations.map((a) => (
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
