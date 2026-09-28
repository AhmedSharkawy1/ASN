'use client';

import React, { createContext, useContext } from 'react';

export interface MenuConfigContextType {
  highQualityImages?: boolean;
}

const MenuConfigContext = createContext<MenuConfigContextType>({
  highQualityImages: false,
});

export function MenuConfigProvider({
  children,
  highQualityImages = false,
}: {
  children: React.ReactNode;
  highQualityImages?: boolean;
}) {
  return (
    <MenuConfigContext.Provider value={{ highQualityImages }}>
      {children}
    </MenuConfigContext.Provider>
  );
}

export function useMenuConfig() {
  return useContext(MenuConfigContext);
}
