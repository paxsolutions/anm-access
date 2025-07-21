import React, { useEffect, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { fetchNannyById } from '../api';

const NannyProfile = () => {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const [nanny, setNanny] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadNanny = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const data = await fetchNannyById(parseInt(id));

        if (data) {
          setNanny(data);
        } else {
          setError('Nanny not found');
        }
      } catch (err) {
        console.error('Error loading nanny:', err);
        setError('Failed to load nanny data');
      } finally {
        setLoading(false);
      }
    };

    loadNanny();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 my-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!nanny) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        No nanny data found
      </div>
    );
  }

  // Helper function to format field names
  const formatFieldName = (key: string) => {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            {nanny.first_name} {nanny.last_name}'s Profile
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Detailed information about this nanny
          </p>
        </div>
        <button
          onClick={() => history.goBack()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Back to List
        </button>
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700">
        <dl>
          {Object.entries(nanny).map(([key, value]) => {
            // Skip if value is null or empty object
            if (value === null || (typeof value === 'object' && Object.keys(value).length === 0)) {
              return null;
            }

            // Format the value for display
            let displayValue: React.ReactNode = String(value);

            // Handle dates
            if (key.endsWith('_date') || key.endsWith('_at') || key === 'create_time') {
              try {
                displayValue = new Date(value as string).toLocaleString();
              } catch (e) {
                // If date parsing fails, just use the raw value
                console.error('Error parsing date:', e);
              }
            }

            // Handle boolean values
            if (typeof value === 'boolean') {
              displayValue = value ? 'Yes' : 'No';
            }

            return (
              <div
                key={key}
                className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 border-b border-gray-100 dark:border-gray-700"
              >
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">
                  {formatFieldName(key)}
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:mt-0 sm:col-span-2 break-words">
                  {displayValue}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </div>
  );
};

export default NannyProfile;
