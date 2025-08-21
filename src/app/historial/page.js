"use client";

import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";

export default function Historial() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const obtenerLogs = async () => {
      const q = query(collection(db, "logs"), orderBy("fecha", "desc"));
      const snapshot = await getDocs(q);
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    obtenerLogs();
  }, []);

  return (
    <div>
      <h2>Historial de acciones</h2>
      <ul>
        {logs.map(log => (
          <li key={log.id}>
            <b>{log.accion}</b> - {log.fecha?.toDate().toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}
