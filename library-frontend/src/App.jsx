import { useEffect, useState } from "react";
import Authors from "./components/Authors";
import Books from "./components/Books";
import NewBook from "./components/NewBook";
import LoginForm from "./components/LoginForm";
import Notify from "./components/Notify";
import Recommend from "./components/Recommend";
import { useApolloClient, useSubscription } from "@apollo/client";
import { BOOK_ADDED } from "./queries/queries";

const App = () => {
  const [page, setPage] = useState("authors");
  const [token, setToken] = useState(null);
  const client = useApolloClient();
  const [message, setMessage] = useState(null);
  const [notifClass, setNotifClass] = useState("notification");

  useEffect(() => {
    setToken(localStorage.getItem("booklist-user-token"));
  }, [token]);

  const logout = () => {
    setToken(null);
    localStorage.clear();
    client.resetStore();
    if (page === "add" || page === "recommend") {
      setPage("login");
    }
  };

  useSubscription(BOOK_ADDED, {
    onError: ({ error }) => {
      console.log(error.message);
      setMessage(`Error: ${error.message}`);
      setNotifClass("error");
      setTimeout(() => {
        setMessage(null);
        setNotifClass("notification");
      }, 5000);
    },
    onData: ({ data }) => {
      console.log(data.data.bookAdded);
      const bookAdded = data.data.bookAdded;
      setMessage(
        `New book added: ${bookAdded.title} by ${bookAdded.author.name}`
      );
      if (notifClass !== "notification") setNotifClass("notification");
      setTimeout(() => {
        setMessage(null);
      }, 5000);
    },
  });

  return (
    <div>
      <Notify message={message} className={notifClass} />
      <div>
        <button onClick={() => setPage("authors")}>authors</button>
        <button onClick={() => setPage("books")}>books</button>
        {!token ? (
          <button onClick={() => setPage("login")}>log in</button>
        ) : (
          <div>
            <button onClick={() => setPage("add")}>add book</button>
            <button onClick={() => setPage("recommend")}>recommend</button>
          </div>
        )}
        {token && <button onClick={logout}>logout</button>}
      </div>

      <Authors show={page === "authors"} setMessage={setMessage} />

      <Books show={page === "books"} setMessage={setMessage} />

      <NewBook
        show={page === "add"}
        setMessage={setMessage}
        setNotifClass={setNotifClass}
      />

      <Recommend
        show={page === "recommend"}
        setMessage={setMessage}
        token={token}
      />

      <LoginForm
        setToken={setToken}
        setPage={setPage}
        setMessage={setMessage}
        show={page === "login"}
      />
    </div>
  );
};

export default App;
