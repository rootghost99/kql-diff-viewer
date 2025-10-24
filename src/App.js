import React, { useState } from 'react';

export default function KQLDiffViewer() {
  const [originalQuery, setOriginalQuery] = useState('');
  const [updatedQuery, setUpdatedQuery] = useState('');
  const [showDiff, setShowDiff] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Character-level diff for modified lines
  const getCharDiff = (str1, str2) => {
    const result1 = [];
    const result2 = [];
    let i = 0;
    let j = 0;
    
    while (i < str1.length || j < str2.length) {
      if (i < str1.length && j < str2.length && str1[i] === str2[j]) {
        result1.push({ char: str1[i], changed: false });
        result2.push({ char: str2[j], changed: false });
        i++;
        j++;
      } else {
        let found = false;
        
        // Look ahead to find matching sequence
        for (let k = 1; k <= Math.min(20, str1.length - i, str2.length - j); k++) {
          if (str1.substring(i, i + k) === str2.substring(j, j + k)) {
            // Mark differences before the match
            while (i < str1.length && str1[i] !== str2[j]) {
              result1.push({ char: str1[i], changed: true });
              i++;
            }
            while (j < str2.length && str2[j] !== str1[i - (i > 0 ? 1 : 0)]) {
              result2.push({ char: str2[j], changed: true });
              j++;
            }
            found = true;
            break;
          }
        }
        
        if (!found) {
          if (i < str1.length) {
            result1.push({ char: str1[i], changed: true });
            i++;
          }
          if (j < str2.length) {
            result2.push({ char: str2[j], changed: true });
            j++;
          }
        }
      }
    }
    
    return { original: result1, updated: result2 };
  };

  // Simple line-based diff algorithm
  const computeDiff = (original, updated) => {
    const originalLines = original.split('\n');
    const updatedLines = updated.split('\n');
    const maxLength = Math.max(originalLines.length, updatedLines.length);
    
    const diff = [];
    for (let i = 0; i < maxLength; i++) {
      const origLine = originalLines[i] || '';
      const updLine = updatedLines[i] || '';
      
      if (origLine === updLine) {
        diff.push({ type: 'unchanged', original: origLine, updated: updLine, lineNum: i + 1 });
      } else if (!origLine && updLine) {
        diff.push({ type: 'added', original: '', updated: updLine, lineNum: i + 1 });
      } else if (origLine && !updLine) {
        diff.push({ type: 'removed', original: origLine, updated: '', lineNum: i + 1 });
      } else {
        const charDiff = getCharDiff(origLine, updLine);
        diff.push({ 
          type: 'modified', 
          original: origLine, 
          updated: updLine, 
          lineNum: i + 1,
          charDiff 
        });
      }
    }
    return diff;
  };

  const generateAIAnalysis = async () => {
    setIsAnalyzing(true);
    setAiAnalysis('');
    
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: `You are a Microsoft Sentinel security analyst reviewing changes to a KQL analytic rule. Analyze the differences between the original and updated queries and provide a clear, concise summary.

ORIGINAL QUERY:
${originalQuery}

UPDATED QUERY:
${updatedQuery}

Provide a summary that includes:
1. A brief overview of what changed
2. The security impact or purpose of the changes
3. Any potential issues or improvements

Keep the response professional and focused on operational impact for an MSSP team.`
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const analysis = data.content[0].text;
      setAiAnalysis(analysis);
    } catch (error) {
      console.error("Error generating AI analysis:", error);
      setAiAnalysis("Failed to generate analysis. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCompare = () => {
    if (originalQuery.trim() && updatedQuery.trim()) {
      setShowDiff(true);
      setAiAnalysis('');
    }
  };

  const handleReset = () => {
    setOriginalQuery('');
    setUpdatedQuery('');
    setShowDiff(false);
    setAiAnalysis('');
  };

  const diff = showDiff ? computeDiff(originalQuery, updatedQuery) : [];

  const getLineStyle = (type) => {
    switch (type) {
      case 'added':
        return 'bg-green-100 border-l-4 border-green-500';
      case 'removed':
        return 'bg-red-100 border-l-4 border-red-500';
      case 'modified':
        return 'bg-yellow-100 border-l-4 border-yellow-500';
      default:
        return 'bg-white';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">KQL Query Diff Viewer</h1>
          <p className="text-gray-600">Compare Sentinel Analytic Rule changes</p>
        </div>

        {!showDiff ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Original KQL Query
              </label>
              <textarea
                value={originalQuery}
                onChange={(e) => setOriginalQuery(e.target.value)}
                className="w-full h-96 p-3 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Paste your original Sentinel Analytic Rule query here..."
              />
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Updated KQL Query
              </label>
              <textarea
                value={updatedQuery}
                onChange={(e) => setUpdatedQuery(e.target.value)}
                className="w-full h-96 p-3 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Paste your updated query here..."
              />
            </div>
          </div>
        ) : (
          <>
            {aiAnalysis && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">AI Analysis</h3>
                <div className="text-gray-800 whitespace-pre-wrap">{aiAnalysis}</div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 bg-gray-100 border-b border-gray-200">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-100 border-l-4 border-green-500"></div>
                    <span className="text-gray-700">Added</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-100 border-l-4 border-red-500"></div>
                    <span className="text-gray-700">Removed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-100 border-l-4 border-yellow-500"></div>
                    <span className="text-gray-700">Modified</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-gray-200">
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Original</h3>
                  <div className="space-y-1">
                    {diff.map((line, idx) => (
                      <div
                        key={idx}
                        className={`p-2 ${getLineStyle(line.type)} font-mono text-xs whitespace-pre-wrap break-all`}
                      >
                        <span className="text-gray-400 mr-3">{line.lineNum}</span>
                        {line.type === 'modified' && line.charDiff ? (
                          <span>
                            {line.charDiff.original.map((item, i) => (
                              <span
                                key={i}
                                className={item.changed ? 'bg-red-300' : ''}
                              >
                                {item.char}
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span>{line.original || ' '}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Updated</h3>
                  <div className="space-y-1">
                    {diff.map((line, idx) => (
                      <div
                        key={idx}
                        className={`p-2 ${getLineStyle(line.type)} font-mono text-xs whitespace-pre-wrap break-all`}
                      >
                        <span className="text-gray-400 mr-3">{line.lineNum}</span>
                        {line.type === 'modified' && line.charDiff ? (
                          <span>
                            {line.charDiff.updated.map((item, i) => (
                              <span
                                key={i}
                                className={item.changed ? 'bg-green-300' : ''}
                              >
                                {item.char}
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span>{line.updated || ' '}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="mt-6 flex gap-4">
          {!showDiff ? (
            <button
              onClick={handleCompare}
              disabled={!originalQuery.trim() || !updatedQuery.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              Compare Queries
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowDiff(false)}
                className="px-6 py-3 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition"
              >
                Back to Edit
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-3 bg-gray-600 text-white rounded-md font-semibold hover:bg-gray-700 transition"
              >
                Start Over
              </button>
              {!aiAnalysis && (
                <button
                  onClick={generateAIAnalysis}
                  disabled={isAnalyzing}
                  className="px-6 py-3 bg-purple-600 text-white rounded-md font-semibold hover:bg-purple-700 disabled:bg-purple-300 transition"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Generate AI Summary'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}