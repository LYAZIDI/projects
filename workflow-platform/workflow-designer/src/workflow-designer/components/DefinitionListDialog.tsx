/**
 * DefinitionListDialog — browse and open existing workflow definitions.
 * Opens from the toolbar's list icon.
 */

import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { useDefinitions } from '../../api/workflowApi';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
}

export function DefinitionListDialog({ open, onClose, onSelect }: Props) {
  const { data: definitions = [], isLoading } = useDefinitions();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
        Open Workflow Definition
        <IconButton sx={{ ml: 'auto' }} onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0, minHeight: 200 }}>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!isLoading && definitions.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 3 }}>
            No workflow definitions found for this tenant.
          </Typography>
        )}

        <List dense disablePadding>
          {definitions.map(def => (
            <ListItem
              key={def.id}
              disablePadding
              secondaryAction={
                <Chip
                  label={`v${def.version}`}
                  size="small"
                  color={def.active ? 'success' : 'default'}
                  variant="outlined"
                />
              }
            >
              <ListItemButton onClick={() => onSelect(def.id!)}>
                <ListItemText
                  primary={def.label || def.entityType}
                  secondary={`entityType: ${def.entityType} · ${def.states?.length ?? 0} states · ${def.transitions?.length ?? 0} transitions`}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
}
