/* eslint-disable react/prop-types */

const Notify = ({ message }) => {
  if (message === null) {
    return null;
  }

  return <div className="notification">{message}</div>;
};

export default Notify;
