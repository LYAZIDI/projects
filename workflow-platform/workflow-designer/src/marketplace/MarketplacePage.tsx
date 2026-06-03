/**
 * MarketplacePage — the main catalog page.
 *
 * Layout:
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  Hero: Featured templates (horizontal scroll)                        │
 * ├──────────────────────────────────────────────────────────────────────┤
 * │  Sidebar: category filter  │  Grid: template cards  (paginated)      │
 * └──────────────────────────────────────────────────────────────────────┘
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Pagination from '@mui/material/Pagination';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Badge from '@mui/material/Badge';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import StorefrontIcon from '@mui/icons-material/Storefront';
import StarIcon from '@mui/icons-material/Star';
import GroupsIcon from '@mui/icons-material/Groups';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import HeadsetMicIcon from '@mui/icons-material/HeadsetMic';
import GavelIcon from '@mui/icons-material/Gavel';
import ComputerIcon from '@mui/icons-material/Computer';
import AppsIcon from '@mui/icons-material/Apps';
import DownloadDoneIcon from '@mui/icons-material/DownloadDone';

import { TemplateCard } from './components/TemplateCard';
import { useCatalog, useFeaturedTemplates, useMyInstalls } from '../api/marketplaceApi';

// ── Category definitions ───────────────────────────────────────────────────────

const CATEGORIES = [
  { key: undefined,   label: 'All',       icon: <AppsIcon />,        color: '#6B7280' },
  { key: 'crm',      label: 'CRM',       icon: <StorefrontIcon />,   color: '#3B82F6' },
  { key: 'hr',       label: 'HR',        icon: <GroupsIcon />,       color: '#8B5CF6' },
  { key: 'finance',  label: 'Finance',   icon: <AttachMoneyIcon />,  color: '#22C55E' },
  { key: 'support',  label: 'Support',   icon: <HeadsetMicIcon />,   color: '#F59E0B' },
  { key: 'legal',    label: 'Legal',     icon: <GavelIcon />,        color: '#EC4899' },
  { key: 'it',       label: 'IT',        icon: <ComputerIcon />,     color: '#06B6D4' },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export function MarketplacePage() {
  const navigate = useNavigate();

  const [category, setCategory] = useState<string | undefined>(undefined);
  const [page, setPage]         = useState(0);

  const { data: catalog, isLoading, isError } = useCatalog(category, page);
  const { data: featured = [] }               = useFeaturedTemplates();
  const { data: installs = [] }               = useMyInstalls();

  const templates   = catalog?.content ?? [];
  const totalPages  = catalog?.totalPages ?? 1;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCategory = (key: string | undefined) => {
    setCategory(key);
    setPage(0);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f8fafc' }}>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #1976d2 100%)',
          color: 'white',
          px: { xs: 2, md: 6 },
          py: 5,
        }}
      >
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Workflow Marketplace
        </Typography>
        <Typography variant="subtitle1" sx={{ opacity: 0.85, mb: 3 }}>
          Production-ready workflow templates for CRM, HR, Finance, Support and more.
          Install in one click — no code required.
        </Typography>

        {/* My installs quick link */}
        {installs.length > 0 && (
          <Chip
            icon={<DownloadDoneIcon />}
            label={`${installs.length} workflow${installs.length > 1 ? 's' : ''} installed`}
            onClick={() => navigate('/marketplace/my-installs')}
            sx={{
              background: 'rgba(255,255,255,0.15)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              cursor: 'pointer',
              '&:hover': { background: 'rgba(255,255,255,0.25)' },
            }}
          />
        )}
      </Box>

      {/* ── Featured row ─────────────────────────────────────────────────── */}
      {featured.length > 0 && (
        <Box sx={{ px: { xs: 2, md: 6 }, py: 3, background: 'white', borderBottom: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <StarIcon sx={{ color: '#F59E0B' }} />
            <Typography variant="subtitle1" fontWeight={700}>Featured</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
            {featured.map(t => (
              <Box key={t.id} sx={{ minWidth: 260, maxWidth: 260 }}>
                <TemplateCard template={t} />
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* ── Main body: sidebar + grid ─────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          flex: 1,
          px: { xs: 1, md: 6 },
          py: 3,
          gap: 3,
          maxWidth: 1400,
          mx: 'auto',
          width: '100%',
        }}
      >
        {/* ── Sidebar ───────────────────────────────────────────────────── */}
        <Box
          sx={{
            width: 200,
            flexShrink: 0,
            display: { xs: 'none', md: 'block' },
          }}
        >
          <Typography variant="overline" color="text.secondary" sx={{ px: 1 }}>
            Categories
          </Typography>
          <List dense disablePadding>
            {CATEGORIES.map(cat => (
              <ListItemButton
                key={cat.label}
                selected={category === cat.key}
                onClick={() => handleCategory(cat.key)}
                sx={{
                  borderRadius: 1.5,
                  mb: 0.25,
                  '&.Mui-selected': {
                    background: `${cat.color}18`,
                    color: cat.color,
                    '& .MuiListItemIcon-root': { color: cat.color },
                    '&:hover': { background: `${cat.color}28` },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>{cat.icon}</ListItemIcon>
                <ListItemText primary={cat.label} primaryTypographyProps={{ fontSize: 14 }} />
              </ListItemButton>
            ))}
          </List>

          <Divider sx={{ my: 2 }} />

          <ListItemButton
            onClick={() => navigate('/marketplace/my-installs')}
            sx={{ borderRadius: 1.5 }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <Badge badgeContent={installs.length} color="primary" max={99}>
                <DownloadDoneIcon />
              </Badge>
            </ListItemIcon>
            <ListItemText primary="My Installs" primaryTypographyProps={{ fontSize: 14 }} />
          </ListItemButton>
        </Box>

        {/* ── Grid ──────────────────────────────────────────────────────── */}
        <Box sx={{ flex: 1 }}>
          {/* Category heading */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>
              {CATEGORIES.find(c => c.key === category)?.label ?? 'All'} Templates
            </Typography>
            {catalog && (
              <Typography variant="body2" color="text.secondary" sx={{ ml: 1.5 }}>
                ({catalog.totalElements})
              </Typography>
            )}
          </Box>

          {/* Loading */}
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          )}

          {/* Error */}
          {isError && (
            <Alert severity="error">Failed to load marketplace templates.</Alert>
          )}

          {/* Empty */}
          {!isLoading && !isError && templates.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <Typography variant="h6" color="text.secondary">No templates in this category yet.</Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Be the first to publish one!
              </Typography>
            </Box>
          )}

          {/* Card grid */}
          {!isLoading && templates.length > 0 && (
            <Grid container spacing={2}>
              {templates.map(t => (
                <Grid item xs={12} sm={6} lg={4} key={t.id}>
                  <TemplateCard template={t} />
                </Grid>
              ))}
            </Grid>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page + 1}
                onChange={(_, p) => setPage(p - 1)}
                color="primary"
              />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
