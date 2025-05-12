// CodeBlockViewer.tsx

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface CodeBlockViewerProps {
  code: string;
  language?: string; // optional
  theme?: 'light' | 'dark';
  fontSize?: number;
}

const CodeBlockViewer: React.FC<CodeBlockViewerProps> = ({
  code,
  language,
  theme = 'light',
  fontSize = 14,
}) => {
  const escapedCode = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const styleLink =
    theme === 'dark'
      ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css'
      : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-light.min.css';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <link rel="stylesheet" href="${styleLink}">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
        ${language ? `<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/${language}.min.js"></script>` : ''}
        <script>
          document.addEventListener("DOMContentLoaded", function() {
            const codeBlock = document.querySelector('pre code');
            ${language ? 'hljs.highlightElement(codeBlock);' : 'hljs.highlightElement(codeBlock);'} 
          });
        </script>
        <style>
          body {
            margin: 0;
            padding: 12px;
            background-color: ${theme === 'dark' ? '#282c34' : '#f6f8fa'};
          }
          pre {
            overflow-x: auto;
            padding: 12px;
            border-radius: 8px;
            font-size: ${fontSize}px;
          }
          code {
            white-space: pre;
          }
        </style>
      </head>
      <body>
        <pre><code ${language ? `class="${language}"` : ''}>${escapedCode}</code></pre>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={{ backgroundColor: 'transparent', minHeight: 100 }}
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 8,
    marginVertical: 8,
    overflow: 'hidden',
  },
});

export default CodeBlockViewer;
