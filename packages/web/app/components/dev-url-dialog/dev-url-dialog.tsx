'use client';

import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

import { clearDevUrl, getDevUrlState, setDevUrl, type DevUrlState } from '@/app/lib/dev-url';

interface DevUrlDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function DevUrlDialog({ open, onClose }: DevUrlDialogProps) {
  const [state, setState] = useState<DevUrlState | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const next = await getDevUrlState();
      if (cancelled) return;
      setState(next);
      setInput(next?.currentUrl ?? '');
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const save = async () => {
    if (!input.trim()) return;
    setBusy(true);
    await setDevUrl(input.trim());
  };

  const clear = async () => {
    setBusy(true);
    await clearDevUrl();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Dev URL</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Point the WebView at a different origin. The app will relaunch after saving.
          </Typography>
          <TextField
            label="Server URL"
            placeholder={state?.defaultUrl ?? 'https://www.boardsesh.com'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            fullWidth
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
          <Button
            size="small"
            variant="outlined"
            onClick={() => setInput(state?.defaultUrl ?? 'https://www.boardsesh.com')}
          >
            Use production
          </Button>
          {state?.currentUrl && (
            <Typography variant="caption" color="text.secondary">
              Currently overriding to: {state.currentUrl}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={clear} disabled={busy || !state?.currentUrl} color="warning">
          Clear override
        </Button>
        <Button onClick={save} disabled={busy || !input.trim()} variant="contained">
          Save & restart
        </Button>
      </DialogActions>
    </Dialog>
  );
}
