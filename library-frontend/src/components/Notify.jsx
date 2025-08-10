/* eslint-disable react/prop-types */

const Notify = ({ message, className }) => {
  if (message === null) {
    return null;
  }

  return <div className={className}>{message}</div>;
};

export default Notify;
