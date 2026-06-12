import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

const LoginHistory = () => {
  const { userId } = useParams();
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.get(`/api/users/login-history/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setData(res.data.items || []);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Login History</h2>

      <table className="w-full border text-center">
        <thead className="bg-gray-200">
          <tr>
            <th>S.No</th>
            <th>Login Time</th>
          </tr>
        </thead>

        <tbody>
          {data.map((item, index) => (
            <tr key={item._id}>
              <td>{index + 1}</td>
              <td>{new Date(item.loginTime).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LoginHistory;