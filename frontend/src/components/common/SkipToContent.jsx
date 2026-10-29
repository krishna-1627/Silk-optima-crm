function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:inline-flex rounded-full bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-lg"
    >
      Skip to main content
    </a>
  );
}

export default SkipToContent;
