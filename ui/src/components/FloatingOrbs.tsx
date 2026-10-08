const FloatingOrbs = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Primary large orb */}
      <div
        className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-orb-1 opacity-60 blur-3xl animate-float-slow"
      />
      
      {/* Secondary orb */}
      <div
        className="absolute top-1/3 -left-48 w-[400px] h-[400px] rounded-full bg-orb-2 opacity-50 blur-3xl animate-float-slower"
      />
      
      {/* Tertiary smaller orb */}
      <div
        className="absolute bottom-20 right-1/4 w-[300px] h-[300px] rounded-full bg-orb-3 opacity-40 blur-3xl animate-float-slowest"
      />
      
      {/* Subtle accent orb */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-orb-1 opacity-20 blur-3xl"
      />
    </div>
  );
};

export default FloatingOrbs;
