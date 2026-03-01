import ChessBoard from "./components/ChessBoard";

function App() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-6 rounded-xl shadow-xl">
        <h1 className="text-3xl text-white font-bold mb-6 text-center">
          ChessPlay Game ♟️
        </h1>
        <ChessBoard />
      </div>
    </div>
  );
}

export default App;
