import { useState } from 'react';
import axios from 'axios';

export const useInterview = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const startInterview = async (file) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('userId', localStorage.getItem('userId'));
      
      const res = await axios.post('http://localhost:5000/api/interview/start', formData);
      return res.data;
    } catch (err) {
      const errMsg = err.response?.data?.error || "Failed to start interview.";
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (threadId, answer) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post('http://localhost:5000/api/interview/answer', {
        threadId,
        answer
      });
      return res.data;
    } catch (err) {
      const errMsg = err.response?.data?.error || "Failed to submit answer.";
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return { startInterview, submitAnswer, loading, error };
};