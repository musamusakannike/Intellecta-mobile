import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TouchableWithoutFeedback,
    TextInput,
    Switch,
    ScrollView
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export const FilterModal = ({
    visible,
    onClose,
    onApply,
    onReset,
    initialFilters
}: { visible: boolean, onClose: any, onApply: any, onReset: any, initialFilters: any }) => {
    const [filters, setFilters] = useState(initialFilters);

    // Sort options
    const sortOptions = [
        { value: 'createdAt', label: 'Newest', order: 'desc' },
        { value: 'createdAt', label: 'Oldest', order: 'asc' },
        { value: 'price', label: 'Price: Low to High', order: 'asc' },
        { value: 'price', label: 'Price: High to Low', order: 'desc' },
        { value: 'rating', label: 'Rating', order: 'desc' },
    ];

    const handleSortSelect = (option: any) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setFilters({
            ...filters,
            sortBy: option.value,
            sortOrder: option.order
        });
    };

    const handleApply = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onApply(filters);
    };

    const handleReset = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onReset();
    };

    // Check if current sort is selected
    const isSortSelected = (option: any) => {
        return filters.sortBy === option.value && filters.sortOrder === option.order;
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.modalOverlay}>
                    <BlurView intensity={20} style={styles.blurView} tint="dark" />

                    <TouchableWithoutFeedback>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={onClose}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="close" size={24} color="#FFFFFF" />
                                </TouchableOpacity>

                                <Text style={styles.modalTitle}>Filters</Text>

                                <TouchableOpacity
                                    style={styles.resetButton}
                                    onPress={handleReset}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.resetText}>Reset</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.modalBody}>
                                {/* Price Range */}
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Price Range</Text>

                                    <View style={styles.priceContainer}>
                                        <View style={styles.priceInput}>
                                            <Text style={styles.inputLabel}>Min</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="0"
                                                placeholderTextColor="#8A8FA3"
                                                keyboardType="numeric"
                                                value={filters.minPrice}
                                                onChangeText={(text) => setFilters({ ...filters, minPrice: text })}
                                            />
                                        </View>

                                        <View style={styles.priceSeparator} />

                                        <View style={styles.priceInput}>
                                            <Text style={styles.inputLabel}>Max</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Any"
                                                placeholderTextColor="#8A8FA3"
                                                keyboardType="numeric"
                                                value={filters.maxPrice}
                                                onChangeText={(text) => setFilters({ ...filters, maxPrice: text })}
                                            />
                                        </View>
                                    </View>
                                </View>

                                {/* Featured Courses Toggle */}
                                <View style={styles.section}>
                                    <View style={styles.toggleContainer}>
                                        <Text style={styles.toggleText}>Featured Courses Only</Text>
                                        <Switch
                                            value={filters.isFeatured}
                                            onValueChange={(value) => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setFilters({ ...filters, isFeatured: value });
                                            }}
                                            trackColor={{ false: 'rgba(255, 255, 255, 0.1)', true: '#4F78FF' }}
                                            thumbColor="#FFFFFF"
                                        />
                                    </View>
                                </View>

                                {/* Sort By */}
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Sort By</Text>

                                    {sortOptions.map((option, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.sortOption}
                                            onPress={() => handleSortSelect(option)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.sortText}>{option.label}</Text>
                                            {isSortSelected(option) && (
                                                <Ionicons name="checkmark-circle" size={20} color="#4F78FF" />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>

                            <View style={styles.modalFooter}>
                                <TouchableOpacity
                                    style={styles.applyButton}
                                    onPress={handleApply}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.applyButtonText}>Apply Filters</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    blurView: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#121839',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 16,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    closeButton: {
        padding: 8,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    resetButton: {
        padding: 8,
    },
    resetText: {
        fontSize: 14,
        color: '#4F78FF',
        fontWeight: '600',
    },
    modalBody: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 16,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    priceInput: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 12,
        color: '#B4C6EF',
        marginBottom: 8,
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: '#FFFFFF',
        fontSize: 16,
    },
    priceSeparator: {
        width: 16,
    },
    toggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    toggleText: {
        fontSize: 16,
        color: '#FFFFFF',
    },
    sortOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    sortText: {
        fontSize: 16,
        color: '#FFFFFF',
    },
    modalFooter: {
        padding: 20,
        paddingBottom: 30,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    applyButton: {
        backgroundColor: '#4F78FF',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    applyButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});