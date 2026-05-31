export default function LoginLoading() {
    return (
        <main className="min-h-screen bg-slate-300/80 dark:bg-background flex items-center justify-center p-6">
            <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row items-stretch min-h-[600px] rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] border border-glass-border animate-pulse">

                {/* Left Side Skeleton */}
                <div className="hidden md:flex flex-col justify-between w-1/2 bg-gradient-to-br from-blue-900/80 via-blue/40 to-cyan-900/60 p-12 relative overflow-hidden backdrop-blur-xl border-r border-glass-border">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-white/20" />
                            <div className="h-7 w-40 rounded-lg bg-white/20" />
                        </div>
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="h-10 w-3/4 rounded-lg bg-white/15" />
                        <div className="h-10 w-1/2 rounded-lg bg-white/10" />
                        <div className="h-5 w-full rounded bg-white/10 mt-4" />
                        <div className="h-5 w-2/3 rounded bg-white/10" />
                    </div>
                    <div className="relative z-10">
                        <div className="h-4 w-32 rounded bg-white/15" />
                    </div>
                </div>

                {/* Right Side Skeleton */}
                <div className="w-full md:w-1/2 bg-background/60 backdrop-blur-2xl p-8 md:p-12 flex flex-col justify-center">
                    <div className="max-w-md w-full mx-auto space-y-6">
                        <div className="text-center space-y-3 mb-10">
                            <div className="h-8 w-40 rounded-lg bg-foreground/10 mx-auto" />
                            <div className="h-4 w-64 rounded bg-foreground/5 mx-auto" />
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="h-4 w-32 rounded bg-foreground/10" />
                                <div className="h-12 w-full rounded-xl bg-foreground/5 border border-glass-border" />
                            </div>
                            <div className="space-y-2">
                                <div className="h-4 w-24 rounded bg-foreground/10" />
                                <div className="h-12 w-full rounded-xl bg-foreground/5 border border-glass-border" />
                            </div>
                            <div className="h-14 w-full rounded-xl bg-gradient-to-r from-blue/40 to-cyan-500/40 mt-6" />
                        </div>
                    </div>
                </div>

            </div>
        </main>
    );
}
