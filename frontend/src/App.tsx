import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Switch, useHistory } from "react-router-dom";
import { SunIcon, MoonIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import Table from "./components/Table";
import NannyProfile from "./components/NannyProfile";
import './App.css';

// Define the type for the Layout component props
interface LayoutProps {
  children: React.ReactNode;
  showBackButton?: boolean;
}

const App = () => {
  const [darkMode, setDarkMode] = useState(() => {
    // Check for saved theme preference or use system preference
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) return savedTheme === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    // Apply the theme class to the root element
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Layout component to share common UI between routes
  const Layout: React.FC<LayoutProps> = ({ children, showBackButton = false }) => {
    const history = useHistory();

    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              {showBackButton && (
                <button
                  onClick={() => history.goBack()}
                  className="mr-4 p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  aria-label="Go back"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </button>
              )}
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {showBackButton ? 'Nanny Profile' : 'ANM Legacy'}
              </h1>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 shadow-lg rounded-lg transition-colors duration-200">
            {children}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Router>
      <Switch>
        <Route
          exact
          path="/"
          render={() => (
            <Layout>
              <Table />
            </Layout>
          )}
        />
        <Route
          path="/nanny/:id"
          render={() => (
            <Layout showBackButton={true}>
              <NannyProfile />
            </Layout>
          )}
        />
      </Switch>
    </Router>
  );
};

export default App;
