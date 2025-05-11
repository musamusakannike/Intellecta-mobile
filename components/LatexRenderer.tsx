// LatexRenderer.tsx

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface LatexRendererProps {
  latex: string;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number; // in pixels
}

const LatexRenderer: React.FC<LatexRendererProps> = ({
  latex,
  backgroundColor = '#090E23',
  textColor = '#fff',
  fontSize = 30, // default font size (in px)
}) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
        <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
        <script defer>
          document.addEventListener("DOMContentLoaded", function() {
            const latex = ${JSON.stringify(latex)};
            katex.render(latex, document.getElementById('math'), {
              throwOnError: false,
              displayMode: true
            });
          });
        </script>
        <style>
          body {
            margin: 0;
            padding: 10px;
            background-color: ${backgroundColor};
            color: ${textColor};
          }
          #math {
            font-size: ${fontSize}px;
          }
        </style>
      </head>
      <body>
        <div id="math"></div>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={{ backgroundColor: 'transparent' }}
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: 50,
  },
});

export default LatexRenderer;
