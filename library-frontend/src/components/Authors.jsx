/* eslint-disable react/prop-types */
import { useQuery, useMutation } from "@apollo/client";
import { ALL_AUTHORS, UPDATE_AUTHOR } from "../queries/queries";
import { useState } from "react";
import Select from "react-select";

const Authors = (props) => {
  const result = useQuery(ALL_AUTHORS);
  const [author, setAuthor] = useState(null);
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
  const options = authors.map((author) => ({
    value: author.name,
    label: author.name,
  }));

  const submit = async (event) => {
    event.preventDefault();
    updateAuthor({
      variables: { name: author.value, setBornTo: Number(born) },
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
      <Select defaultValue={author} onChange={setAuthor} options={options} />
      <form onSubmit={submit}>
        <input value={born} onChange={({ target }) => setBorn(target.value)} />
        <button type="submit">update author</button>
      </form>
    </div>
  );
};

export default Authors;
