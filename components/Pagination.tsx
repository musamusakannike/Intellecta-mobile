import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const Pagination = ({ currentPage, totalPages, onPageChange }: { currentPage: number, totalPages: number, onPageChange: any }) => {
  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    
    // Always show first page
    pages.push(1);
    
    // Current page range
    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);
    
    // Add ellipsis if needed
    if (start > 2) {
      pages.push('...');
    }
    
    // Add page numbers around current page
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    // Add ellipsis if needed
    if (end < totalPages - 1) {
      pages.push('...');
    }
    
    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    
    return pages;
  };
  
  const pageNumbers = getPageNumbers();
  
  return (
    <View style={styles.container}>
      {/* Previous button */}
      <TouchableOpacity
        style={[
          styles.arrowButton,
          currentPage === 1 && styles.disabledButton
        ]}
        onPress={() => currentPage > 1 && onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={20} color={currentPage === 1 ? "#8A8FA3" : "#FFFFFF"} />
      </TouchableOpacity>
      
      {/* Page numbers */}
      <View style={styles.pageNumbers}>
        {pageNumbers.map((page, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.pageButton,
              page === currentPage && styles.activePageButton,
              page === '...' && styles.ellipsis
            ]}
            onPress={() => page !== '...' && onPageChange(page)}
            disabled={page === '...' || page === currentPage}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.pageText,
              page === currentPage && styles.activePageText
            ]}>
              {page}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Next button */}
      <TouchableOpacity
        style={[
          styles.arrowButton,
          currentPage === totalPages && styles.disabledButton
        ]}
        onPress={() => currentPage < totalPages && onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-forward" size={20} color={currentPage === totalPages ? "#8A8FA3" : "#FFFFFF"} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 24,
    paddingHorizontal: 10,
  },
  pageNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 4,
  },
  activePageButton: {
    backgroundColor: '#4F78FF',
  },
  pageText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  activePageText: {
    fontWeight: 'bold',
  },
  arrowButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 8,
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    opacity: 0.5,
  },
  ellipsis: {
    backgroundColor: 'transparent',
  },
});