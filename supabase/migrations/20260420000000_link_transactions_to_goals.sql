
-- Add goal_id to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_goal_id ON public.transactions(goal_id);

-- Create or replace the function to update goal progress
CREATE OR REPLACE FUNCTION public.update_goal_progress()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Handle DELETE or UPDATE (remove old amount from old goal)
    IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
        IF OLD.goal_id IS NOT NULL AND OLD.type = 'income' THEN
            UPDATE public.goals
            SET current_amount = GREATEST(0, current_amount - OLD.amount),
                updated_at = now()
            WHERE id = OLD.goal_id;
            
            -- Update is_completed status
            UPDATE public.goals
            SET is_completed = current_amount >= target_amount
            WHERE id = OLD.goal_id;
        END IF;
    END IF;

    -- Handle INSERT or UPDATE (add new amount to new goal)
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        IF NEW.goal_id IS NOT NULL AND NEW.type = 'income' THEN
            UPDATE public.goals
            SET current_amount = current_amount + NEW.amount,
                updated_at = now()
            WHERE id = NEW.goal_id;
            
            -- Update is_completed status
            UPDATE public.goals
            SET is_completed = current_amount >= target_amount
            WHERE id = NEW.goal_id;
        END IF;
    END IF;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_update_goal_progress ON public.transactions;
CREATE TRIGGER trg_update_goal_progress
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.update_goal_progress();
