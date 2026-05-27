'use client';

import { useEffect, useState } from 'react';
import {
    SlidersHorizontal,
    Plus,
    Edit,
    Trash2,
    Loader,
    Save,
    X,
    AlertTriangle,
} from 'lucide-react';
import { adminFetch } from '@/lib/adminApi';

interface Threshold {
    id: string;
    name: string;
    category: string;
    value: number;
    minValue: number | null;
    maxValue: number | null;
    description: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export default function ThresholdsPage() {
    const [thresholds, setThresholds] = useState<Threshold[]>([]);
    const [groupedThresholds, setGroupedThresholds] = useState<Record<string, Threshold[]>>({});
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingThreshold, setEditingThreshold] = useState<Threshold | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        category: 'prediction',
        value: 0,
        minValue: '',
        maxValue: '',
        description: '',
    });

    const categories = [
        { value: 'prediction', label: 'Prediction', color: 'blue' },
        { value: 'performance', label: 'Performance', color: 'green' },
        { value: 'alert', label: 'Alert', color: 'orange' },
    ];

    const fetchThresholds = async () => {
        setLoading(true);
        try {
            const res = await adminFetch('/api/admin/thresholds');
            const data = await res.json();

            if (data.success) {
                setThresholds(data.data);
                setGroupedThresholds(data.grouped);
            }
        } catch (error) {
            console.error('Error fetching thresholds:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchThresholds();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const payload = {
                ...formData,
                minValue: formData.minValue ? parseFloat(formData.minValue) : null,
                maxValue: formData.maxValue ? parseFloat(formData.maxValue) : null,
            };

            if (editingThreshold) {
                const res = await adminFetch('/api/admin/thresholds', {
                    method: 'PATCH',
                    body: JSON.stringify({ id: editingThreshold.id, ...payload }),
                });
                const data = await res.json();
                if (data.success) {
                    fetchThresholds();
                    closeModal();
                }
            } else {
                const res = await adminFetch('/api/admin/thresholds', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
                const data = await res.json();
                if (data.success) {
                    fetchThresholds();
                    closeModal();
                }
            }
        } catch (error) {
            console.error('Error saving threshold:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this threshold?')) return;

        try {
            const res = await adminFetch(`/api/admin/thresholds?id=${id}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (data.success) {
                fetchThresholds();
            }
        } catch (error) {
            console.error('Error deleting threshold:', error);
        }
    };

    const openEditModal = (threshold: Threshold) => {
        setEditingThreshold(threshold);
        setFormData({
            name: threshold.name,
            category: threshold.category,
            value: threshold.value,
            minValue: threshold.minValue?.toString() || '',
            maxValue: threshold.maxValue?.toString() || '',
            description: threshold.description || '',
        });
        setShowModal(true);
    };

    const openCreateModal = () => {
        setEditingThreshold(null);
        setFormData({
            name: '',
            category: 'prediction',
            value: 0,
            minValue: '',
            maxValue: '',
            description: '',
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingThreshold(null);
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'prediction':
                return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30';
            case 'performance':
                return 'from-green-500/20 to-emerald-500/20 border-green-500/30';
            case 'alert':
                return 'from-orange-500/20 to-red-500/20 border-orange-500/30';
            default:
                return 'from-gray-500/20 to-slate-500/20 border-gray-500/30';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Threshold Management</h1>
                    <p className="text-gray-400">Configure system thresholds and alerts</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-red-600 transition-all"
                >
                    <Plus className="w-5 h-5" />
                    <span>Add Threshold</span>
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader className="w-8 h-8 animate-spin text-orange-500" />
                </div>
            ) : thresholds.length === 0 ? (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
                    <SlidersHorizontal className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 mb-4">No thresholds configured yet</p>
                    <button
                        onClick={openCreateModal}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                    >
                        Create First Threshold
                    </button>
                </div>
            ) : (
                <div className="space-y-8">
                    {categories.map((cat) => {
                        const catThresholds = groupedThresholds[cat.value] || [];
                        if (catThresholds.length === 0) return null;

                        return (
                            <div key={cat.value}>
                                <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                                    <span
                                        className={`w-3 h-3 rounded-full ${
                                            cat.color === 'blue'
                                                ? 'bg-blue-500'
                                                : cat.color === 'green'
                                                ? 'bg-green-500'
                                                : 'bg-orange-500'
                                        }`}
                                    ></span>
                                    <span>{cat.label} Thresholds</span>
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {catThresholds.map((threshold) => (
                                        <div
                                            key={threshold.id}
                                            className={`bg-gradient-to-br ${getCategoryColor(
                                                threshold.category
                                            )} border rounded-xl p-6`}
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div>
                                                    <h3 className="text-white font-semibold">
                                                        {threshold.name}
                                                    </h3>
                                                    <p className="text-gray-400 text-sm mt-1">
                                                        {threshold.description || 'No description'}
                                                    </p>
                                                </div>
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => openEditModal(threshold)}
                                                        className="p-2 rounded-lg hover:bg-slate-700/50 text-gray-400 hover:text-white transition-colors"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(threshold.id)}
                                                        className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400 text-sm">
                                                        Current Value
                                                    </span>
                                                    <span className="text-white font-bold text-xl">
                                                        {threshold.value}
                                                    </span>
                                                </div>

                                                {(threshold.minValue !== null ||
                                                    threshold.maxValue !== null) && (
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-gray-400">Range</span>
                                                        <span className="text-gray-300">
                                                            {threshold.minValue ?? '–'} to{' '}
                                                            {threshold.maxValue ?? '–'}
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400 text-sm">
                                                        Status
                                                    </span>
                                                    <span
                                                        className={`px-2 py-1 rounded text-xs font-medium ${
                                                            threshold.isActive
                                                                ? 'bg-green-500/20 text-green-400'
                                                                : 'bg-red-500/20 text-red-400'
                                                        }`}
                                                    >
                                                        {threshold.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-lg mx-4">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white">
                                {editingThreshold ? 'Edit Threshold' : 'Create Threshold'}
                            </h3>
                            <button
                                onClick={closeModal}
                                className="text-gray-400 hover:text-white"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    required
                                    disabled={!!editingThreshold}
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Category</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) =>
                                        setFormData({ ...formData, category: e.target.value })
                                    }
                                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    disabled={!!editingThreshold}
                                >
                                    {categories.map((cat) => (
                                        <option key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Value</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={formData.value}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            value: parseFloat(e.target.value),
                                        })
                                    }
                                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">
                                        Min Value (optional)
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={formData.minValue}
                                        onChange={(e) =>
                                            setFormData({ ...formData, minValue: e.target.value })
                                        }
                                        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">
                                        Max Value (optional)
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={formData.maxValue}
                                        onChange={(e) =>
                                            setFormData({ ...formData, maxValue: e.target.value })
                                        }
                                        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">
                                    Description (optional)
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                    rows={3}
                                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
                                />
                            </div>

                            <div className="flex space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-red-600 flex items-center justify-center space-x-2"
                                >
                                    <Save className="w-4 h-4" />
                                    <span>{editingThreshold ? 'Update' : 'Create'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
