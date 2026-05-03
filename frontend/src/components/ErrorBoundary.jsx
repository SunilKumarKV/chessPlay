import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[200px] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center">
            <h2 className="text-lg font-semibold text-red-300 mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-red-100/90">
              Something went wrong — reload the page.
            </p>
            <button
              onClick={this.handleReload}
              className="mt-4 rounded-md bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
