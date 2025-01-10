import { useCallback, useState } from "react";


export interface Tab {
    key: React.Key
}

export interface UseTabsResult<T extends Tab> {
    items: T[],
    active: T['key'] | undefined
    setActive: React.Dispatch<React.SetStateAction<T["key"] | undefined>>,
    removeItem: (key: T['key']) => void,
    createItem: (item: T, setNewTabActive?: boolean) => void
}

export function useTabs<T extends Tab>(): UseTabsResult<T> {

    const [items, setItems] = useState<T[]>([]);
    const [active, setActive] = useState<T['key']>();


    const removeItem = useCallback((key: T['key']) => {
        const itemIdx = items.findIndex(item => item.key == key)

        if (active == key && itemIdx < items.length-1) { 
            setActive(items[itemIdx+1].key);
        } else {
            if (active == key && itemIdx > 0) setActive(items[itemIdx-1].key);
        }
        setItems(items.filter((data)=> data.key != key ))
    }, [active, items])


    const createItem = useCallback((item: T, setNewTabActive?: boolean) => {
        setItems(
            [...items,
                item
            ]
        )
        if (setNewTabActive) setActive(item.key);
    }, [items])

    return { items, active, setActive, removeItem, createItem }
}