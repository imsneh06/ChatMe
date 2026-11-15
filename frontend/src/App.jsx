import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ChatPage from "./pages/ChatPage";
import { ChatState } from "./Context/ChatProvider.jsx";
import "./App.css";

function App() {
  const { darkMode } = ChatState();

  return (
    <div className={`App ${darkMode ? "" : "light-theme"}`}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chats" element={<ChatPage />} />
      </Routes>
    </div>
  );
}

export default App;
