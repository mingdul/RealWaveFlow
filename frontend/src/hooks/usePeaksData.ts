// hooks/usePeaksData.ts
// import { useState, useEffect } from 'react';

// export const usePeaksData = (peaksUrl: string | null) => {
//   const [peaks, setPeaks] = useState<number[] | null>(null);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     if (!peaksUrl) return;

//     const fetchPeaks = async () => {
//       setLoading(true);
//       try {
//         const response = await fetch(peaksUrl);
//         const json = await response.json();
//         setPeaks(json.peaks);
//       } catch (err) {
//         setError('Failed to fetch peaks');
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchPeaks();
//   }, [peaksUrl]);

//   return { peaks, loading, error };
// };
