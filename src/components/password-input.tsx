import { useId, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PasswordInput({ className, id, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return <div className="relative min-w-0 w-full">
    <input {...props} id={inputId} type={visible ? 'text' : 'password'} className={cn('field-input pr-12', className)} />
    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full min-h-11 w-11 rounded-none" disabled={props.disabled} aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} aria-controls={inputId} title={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible((value) => !value)}>
      {visible ? <EyeOff /> : <Eye />}
    </Button>
  </div>;
}