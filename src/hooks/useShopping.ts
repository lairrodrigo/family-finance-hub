import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useShopping = () => {
  const [loading, setLoading] = useState(false);

  const getShoppingLists = useCallback(async () => {
    const { data, error } = await supabase
      .from('shopping_lists')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }, []);

  const createShoppingList = async (name: string, store?: string, family_id?: string, user_id?: string) => {
    const { data, error } = await supabase
      .from('shopping_lists')
      .insert([{ name, store, family_id, user_id }])
      .select()
      .single();
    if (error) throw error;
    return data;
  };

  const deleteShoppingList = async (id: string) => {
    const { error } = await supabase.from('shopping_lists').delete().eq('id', id);
    if (error) throw error;
  };

  const updateShoppingList = async (id: string, updates: any) => {
    const { error } = await supabase.from('shopping_lists').update(updates).eq('id', id);
    if (error) throw error;
  };

  const duplicateShoppingList = async (id: string, user_id: string, family_id: string) => {
    // 1. Get original list and items
    const { data: listData } = await supabase.from('shopping_lists').select('*').eq('id', id).single();
    const { data: itemsData } = await supabase.from('shopping_list_items').select('*').eq('list_id', id);

    // 2. Create new list
    const { data: newList } = await supabase.from('shopping_lists').insert([{
      name: `${listData.name} (Cópia)`,
      store: listData.store,
      family_id,
      user_id
    }]).select().single();

    // 3. Duplicate items
    if (itemsData && itemsData.length > 0) {
      const newItems = itemsData.map(item => ({
        list_id: newList.id,
        name: item.name,
        quantity: item.quantity,
        unit_price_retail: item.unit_price_retail,
        unit_price_wholesale: item.unit_price_wholesale,
        min_qty_wholesale: item.min_qty_wholesale,
        price_type: item.price_type
      }));
      await supabase.from('shopping_list_items').insert(newItems);
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
