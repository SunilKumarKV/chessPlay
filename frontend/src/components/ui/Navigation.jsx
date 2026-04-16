import React from 'react';

// Sidebar Link - Icon + label, active state, hover state, collapsible
export const SidebarLink = ({
  icon,
  label,
  isActive,
  isCollapsed,
  onClick,
  className = '',
  ...props
}) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 ${
        isActive
          ? 'bg-[#81b64c]/10 border-l-4 border-[#81b64c] text-[#81b64c]'
          : 'text-[#7a7a7a] hover:text-[#e0e0e0] hover:bg-[#2a2a2a]'
      } ${className}`}
      {...props}
    >
      <span className="text-xl">{icon}</span>
      {!isCollapsed && (
        <span className="font-medium font-['Inter']">{label}</span>
      )}
    </button>
  );
};

// Tab Bar - Horizontal tabs with active green underline indicator
export const TabBar = ({
  tabs,
  activeTab,
  onTabChange,
  className = '',
  ...props
}) => {
  return (
    <div className={`flex border-b border-[#2a2a2a] ${className}`} {...props}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-6 py-3 font-medium transition-all relative font-['Inter'] ${
            activeTab === tab.id
              ? 'text-[#81b64c]'
              : 'text-[#7a7a7a] hover:text-[#e0e0e0]'
          }`}
        >
          {tab.label}
          {activeTab === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#81b64c]"></div>
          )}
        </button>
      ))}
    </div>
  );
};

// Breadcrumb Navigation
export const Breadcrumb = ({
  items,
  onItemClick,
  className = '',
  ...props
}) => {
  return (
    <nav className={`flex items-center space-x-2 text-sm ${className}`} {...props}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="text-[#7a7a7a]">/</span>}
          <button
            onClick={() => onItemClick && onItemClick(item.id)}
            className={`hover:text-[#81b64c] transition-colors font-['Inter'] ${
              index === items.length - 1
                ? 'text-[#e0e0e0] font-medium'
                : 'text-[#7a7a7a]'
            }`}
            disabled={index === items.length - 1}
          >
            {item.label}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
};