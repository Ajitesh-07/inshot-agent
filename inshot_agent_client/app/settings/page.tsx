'use client';

import { Settings, User, Palette, Bell, Shield, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const settingsSections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'storage', label: 'Storage', icon: HardDrive },
];

export default function SettingsPage() {
    return (
        <div className="min-h-screen p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Settings className="w-6 h-6 text-[#22c55e]" />
                    Settings
                </h1>
                <p className="text-[#71717a] mt-1">
                    Configure your DroidRun Studio preferences
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Settings Navigation */}
                <div className="lg:col-span-1">
                    <nav className="space-y-1">
                        {settingsSections.map((section) => {
                            const Icon = section.icon;
                            const isActive = section.id === 'profile';

                            return (
                                <button
                                    key={section.id}
                                    className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left
                    transition-all duration-200
                    ${isActive
                                            ? 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30'
                                            : 'text-[#a1a1aa] hover:text-white hover:bg-[#18181b]'
                                        }
                  `}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="font-medium">{section.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Settings Content */}
                <div className="lg:col-span-3">
                    <div className="p-6 rounded-xl bg-[#111118] border border-[#1f1f28]">
                        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                            <User className="w-5 h-5 text-[#22c55e]" />
                            Profile Settings
                        </h2>

                        <div className="space-y-6">
                            {/* Avatar */}
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#22c55e] to-[#a855f7] flex items-center justify-center text-xl font-bold text-white">
                                    DR
                                </div>
                                <div>
                                    <Button variant="outline" size="sm">
                                        Change Avatar
                                    </Button>
                                    <p className="text-xs text-[#52525b] mt-1">JPG, PNG or GIF. Max 2MB</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Display Name"
                                    defaultValue="DroidRun User"
                                    placeholder="Enter your name"
                                />
                                <Input
                                    label="Email"
                                    type="email"
                                    defaultValue="user@example.com"
                                    placeholder="Enter your email"
                                />
                            </div>

                            <Input
                                label="API Key"
                                type="password"
                                defaultValue="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                                placeholder="Enter your API key"
                            />

                            <div className="pt-4 border-t border-[#1f1f28]">
                                <Button variant="primary">
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="mt-6 p-6 rounded-xl bg-[#111118] border border-[#ef4444]/30">
                        <h2 className="text-lg font-semibold text-[#ef4444] mb-4">Danger Zone</h2>
                        <p className="text-[#a1a1aa] text-sm mb-4">
                            Once you delete your account, there is no going back. Please be certain.
                        </p>
                        <Button variant="ghost" className="text-[#ef4444] hover:bg-[#ef4444]/10">
                            Delete Account
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
