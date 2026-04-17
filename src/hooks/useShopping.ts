import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useShopping = () => {
  const [loading, setLoading] = useState(false);

  const getShoppingLists = useCallback(async () => {
    const { data, error } = await supabase
      .from('shopping_lists' as any)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }, []);

  const createShoppingList = async (name: string, store?: string, family_id?: string, user_id?: string) => {
    const { data, error } = await supabase
      .from('shopping_lists' as any)
      .insert([{ name, store, family_id, user_id }] as any)
      .select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Acesso negado: Você não possui permissão para esta ação.");
    return data[0];
  };

  const deleteShoppingList = async (id: string) => {
    const { data, error } = await (supabase.from('shopping_lists' as any) as any)
      .delete()
      .eq('id', id)
      .select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Acesso negado: Você não possui permissão para esta ação.");
  };

  const updateShoppingList = async (id: string, updates: any) => {
    const { data, error } = await (supabase.from('shopping_lists' as any) as any)
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Acesso negado: Você não possui permissão para esta ação.");
  };

  const duplicateShoppingList = async (id: string, user_id: string, family_id: string) => {
    const { data: listData } = await supabase.from('shopping_lists' as any).select('*').eq('id', id).single();
    const { data: itemsData } = await supabase.from('shopping_list_items' as any).select('*').eq('list_id', id) as any;

    const { data: newListData, error: listError } = await supabase.from('shopping_lists' as any).insert([{
      name: `${(listData as any).name} (Cópia)`,
      store: (listData as any).store,
      family_id,
      user_id
    }] as any).select();

    if (listError) throw listError;
    if (!newListData || newListData.length === 0) throw new Error("Acesso negado: Você não possui permissão para esta ação.");
    const newList = newListData[0];

    if (itemsData && itemsData.length > 0) {
      const newItems = itemsData.map((item: any) => ({
        list_id: (newList as any).id,
        name: item.name,
        quantity: item.quantity,
        unit_price_retail: item.unit_price_retail,
        unit_price_wholesale: item.unit_price_wholesale,
        min_qty_wholesale: item.min_qty_wholesale,
        price_type: item.price_type
      }));
      const { data: insertedItems, error: itemsError } = await supabase
        .from('shopping_list_items' as any)
        .insert(newItems as any)
        .select();
      if (itemsError) throw itemsError;
      if (!insertedItems || insertedItems.length === 0) throw new Error("Acesso negado: Você não possui permissão para duplicar itens desta lista.");
    }

    return newList;
  };

  return {
    loading,
    getShoppingLists,
    createShoppingList,
    deleteShoppingList,
    updateShoppingList,
    duplicateShoppingList
  };
};
