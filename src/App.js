import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function KQLDiffViewer() {
  const [originalQuery, setOriginalQuery] = useState('');
  const [updatedQuery, setUpdatedQuery] = useState('');
  const [showDiff, setShowDiff] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

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

  // Parse AI response into structured sections
  const parseAIResponse = (text) => {
    const sections = [];
    const lines = text.split('\n');
    let currentSection = null;
    
    for (const line of lines) {
      // Detect section headers
      if (line.match(/^#{1,3}\s+(.+)/)) {
        if (currentSection) sections.push(currentSection);
        const title = line.replace(/^#{1,3}\s+/, '').trim();
        const type = detectSectionType(title);
        currentSection = { title, content: '', type };
      } else if (line.match(/^\d+\.\s+(.+)/) || line.match(/^[-*]\s+(.+)/)) {
        // Numbered or bullet list item
        if (!currentSection) {
          currentSection = { title: 'Overview', content: '', type: 'info' };
        }
        currentSection.content += line + '\n';
      } else if (line.trim()) {
        if (!currentSection) {
          currentSection = { title: 'Overview', content: '', type: 'info' };
        }
        currentSection.content += line + '\n';
      }
    }
    
    if (currentSection) sections.push(currentSection);
    return sections.length > 0 ? sections : [{ title: 'Analysis', content: text, type: 'info' }];
  };

  const detectSectionType = (title) => {
    const lower = title.toLowerCase();
    if (lower.includes('issue') || lower.includes('risk') || lower.includes('concern') || lower.includes('problem')) {
      return 'warning';
    }
    if (lower.includes('improvement') || lower.includes('benefit') || lower.includes('positive') || lower.includes('enhancement')) {
      return 'success';
    }
    if (lower.includes('impact') || lower.includes('change') || lower.includes('overview')) {
      return 'info';
    }
    return 'neutral';
  };

  const getSectionStyle = (type) => {
    const base = darkMode ? 'bg-gray-800' : '';
    switch (type) {
      case 'warning':
        return darkMode 
          ? 'bg-yellow-900 bg-opacity-30 border-yellow-500 border-l-4' 
          : 'bg-yellow-50 border-yellow-300 border-l-4';
      case 'success':
        return darkMode 
          ? 'bg-green-900 bg-opacity-30 border-green-500 border-l-4' 
          : 'bg-green-50 border-green-300 border-l-4';
      case 'info':
        return darkMode 
          ? 'bg-blue-900 bg-opacity-30 border-blue-500 border-l-4' 
          : 'bg-blue-50 border-blue-300 border-l-4';
      default:
        return darkMode 
          ? 'bg-gray-800 border-gray-600 border-l-4' 
          : 'bg-gray-50 border-gray-300 border-l-4';
    }
  };

  const getSectionIcon = (type) => {
    switch (type) {
      case 'warning':
        return '⚠️';
      case 'success':
        return '✅';
      case 'info':
        return 'ℹ️';
      default:
        return '📝';
    }
  };

  const generateAIAnalysis = async () => {
    setIsAnalyzing(true);
    setAiAnalysis(null);
    
    try {
      const workerUrl = 'https://kql-analyzer.derek-macdonald.workers.dev';
      
      const response = await fetch(workerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalQuery,
          updatedQuery
        })
      });

      if (!response.ok) {
        throw new Error(`Worker request failed: ${response.status}`);
      }

      const data = await response.json();
      const analysis = data.content[0].text;
      const parsedSections = parseAIResponse(analysis);
      setAiAnalysis(parsedSections);
    } catch (error) {
      console.error("Error generating AI analysis:", error);
      setAiAnalysis([{ title: 'Error', content: 'Failed to generate analysis. Please try again.', type: 'warning' }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCompare = () => {
    if (originalQuery.trim() && updatedQuery.trim()) {
      setShowDiff(true);
      setAiAnalysis(null);
    }
  };

  const handleReset = () => {
    setOriginalQuery('');
    setUpdatedQuery('');
    setShowDiff(false);
    setAiAnalysis(null);
  };

  const diff = showDiff ? computeDiff(originalQuery, updatedQuery) : [];

  const getLineStyle = (type) => {
    if (darkMode) {
      switch (type) {
        case 'added':
          return 'bg-green-900 bg-opacity-30 border-l-4 border-green-500';
        case 'removed':
          return 'bg-red-900 bg-opacity-30 border-l-4 border-red-500';
        case 'modified':
          return 'bg-yellow-900 bg-opacity-30 border-l-4 border-yellow-500';
        default:
          return 'bg-gray-800';
      }
    } else {
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
    }
  };

  return (
    <div className={`min-h-screen p-6 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              ThreatDefender - KQL Diff App
            </h1>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              Compare Sentinel Analytic Rule changes
            </p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`px-4 py-2 rounded-md font-semibold transition ${
              darkMode 
                ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>

        {!showDiff ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`rounded-lg shadow p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Original KQL Query
              </label>
              <textarea
                value={originalQuery}
                onChange={(e) => setOriginalQuery(e.target.value)}
                className={`w-full h-96 p-3 border rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  darkMode 
                    ? 'bg-gray-900 border-gray-700 text-gray-300' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Paste your original Sentinel Analytic Rule query here..."
              />
            </div>

            <div className={`rounded-lg shadow p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Updated KQL Query
              </label>
              <textarea
                value={updatedQuery}
                onChange={(e) => setUpdatedQuery(e.target.value)}
                className={`w-full h-96 p-3 border rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  darkMode 
                    ? 'bg-gray-900 border-gray-700 text-gray-300' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Paste your updated query here..."
              />
            </div>
          </div>
        ) : (
          <>
            {aiAnalysis && (
              <div className="mb-6 space-y-4">
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  AI Analysis
                </h2>
                {aiAnalysis.map((section, idx) => (
                  <div key={idx} className={`rounded-lg p-6 ${getSectionStyle(section.type)}`}>
                    <h3 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${
                      darkMode ? 'text-gray-100' : 'text-gray-900'
                    }`}>
                      <span>{getSectionIcon(section.type)}</span>
                      {section.title}
                    </h3>
                    <div className={`prose prose-sm max-w-none ${
                      darkMode ? 'text-gray-300 prose-invert' : 'text-gray-800'
                    }`}>
                      <ReactMarkdown>{section.content}</ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className={`rounded-lg shadow overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`p-4 border-b ${
                darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-200'
              }`}>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-100 border-l-4 border-green-500"></div>
                    <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Added</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-100 border-l-4 border-red-500"></div>
                    <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Removed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-100 border-l-4 border-yellow-500"></div>
                    <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Modified</span>
                  </div>
                </div>
              </div>

              <div className={`grid grid-cols-2 divide-x ${
                darkMode ? 'divide-gray-700' : 'divide-gray-200'
              }`}>
                <div className="p-4">
                  <h3 className={`text-sm font-semibold mb-3 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Original</h3>
                  <div className="space-y-1">
                    {diff.map((line, idx) => (
                      <div
                        key={idx}
                        className={`p-2 ${getLineStyle(line.type)} font-mono text-xs whitespace-pre-wrap break-all ${
                          darkMode ? 'text-gray-300' : 'text-gray-900'
                        }`}
                      >
                        <span className={`mr-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          {line.lineNum}
                        </span>
                        {line.type === 'modified' && line.charDiff ? (
                          <span>
                            {line.charDiff.original.map((item, i) => (
                              <span
                                key={i}
                                className={item.changed ? (darkMode ? 'bg-red-500' : 'bg-red-300') : ''}
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
                  <h3 className={`text-sm font-semibold mb-3 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Updated</h3>
                  <div className="space-y-1">
                    {diff.map((line, idx) => (
                      <div
                        key={idx}
                        className={`p-2 ${getLineStyle(line.type)} font-mono text-xs whitespace-pre-wrap break-all ${
                          darkMode ? 'text-gray-300' : 'text-gray-900'
                        }`}
                      >
                        <span className={`mr-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          {line.lineNum}
                        </span>
                        {line.type === 'modified' && line.charDiff ? (
                          <span>
                            {line.charDiff.updated.map((item, i) => (
                              <span
                                key={i}
                                className={item.changed ? (darkMode ? 'bg-green-500' : 'bg-green-300') : ''}
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