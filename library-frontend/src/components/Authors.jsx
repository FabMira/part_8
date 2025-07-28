/* eslint-disable react/prop-types */
import { useQuery, useMutation } from "@apollo/client";
import { ALL_AUTHORS, UPDATE_AUTHOR } from "../queries/queries";
import { useState } from "react";

const Authors = (props) => {
  const result = useQuery(ALL_AUTHORS);
  const [author, setAuthor] = useState("");
  const [born, setBorn] = useState("");
  const [updateAuthor] = useMutation(UPDATE_AUTHOR, {
    refetchQueries: [{ query: ALL_AUTHORS }],
  });

  if (!props.show) {
    return null;
  }

  if (result.loading) {
    return <div>loading...</div>;
  }

  const authors = result.data.allAuthors;

  const submit = async (event) => {
    event.preventDefault();

    updateAuthor({
      variables: { name: author, setBornTo: Number(born) },
    });

    setBorn("");
    setAuthor("");
  };

  return (
    <div>
      <h2>authors</h2>
      <table>
        <tbody>
          <tr>
            <th></th>
            <th>born</th>
            <th>books</th>
          </tr>
          {authors.map((a) => (
            <tr key={a.name}>
              <td>{a.name}</td>
              <td>{a.born}</td>
              <td>{a.bookCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Set birthyear</h2>
      <form onSubmit={submit}>
        <label htmlFor="author">name:</label>
        <select
          name="author"
          id="author"
          onChange={({ target }) => setAuthor(target.value)}
        >
          <option value="">Select an author</option>
          {authors.map((a) => (
            <option key={a.name} value={a.name}>
              {a.name}
            </option>
          ))}
        </select>
        <input value={born} onChange={({ target }) => setBorn(target.value)} />
        <button type="submit">update author</button>
      </form>
    </div>
  );
};

export default Authors;
