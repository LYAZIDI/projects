/**
 * TemplateCard — compact card shown in the marketplace catalog grid.
 *
 * Displays: name, shortDesc, category badge, tags, publisher, install count,
 * "Installed" badge when already installed by tenant, and a CTA button.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import StarIcon from '@mui/icons-material/Star';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import type { TemplateSummary } from '../../api/marketplaceApi';

// Category → color mapping (extensible)
const CATEGORY_COLORS: Record<string, string> = {
  crm:     '#3B82F6',
  hr:      '#8B5CF6',
  finance: '#22C55E',
  support: '#F59E0B',
  legal:   '#EC4899',
  it:      '#06B6D4',
  general: '#6B7280',
};

interface Props {
  template: TemplateSummary;
}

export function TemplateCard({ template }: Props) {
  const navigate  = useNavigate();
  const catColor  = CATEGORY_COLORS[template.category] ?? '#6B7280';

  const rating = template.ratingAvg != null
    ? Number(template.ratingAvg).toFixed(1)
    : null;

  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid #e2e8f0',
        borderRadius: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.2s, transform 0.2s',
        '&:hover': {
          boxShadow: '0 4px 20px #0000001a',
          transform: 'translateY(-2px)',
        },
        cursor: 'pointer',
      }}
      onClick={() => navigate(`/marketplace/${template.id}`)}
    >
      {/* Colored top accent bar */}
      <Box sx={{ height: 4, background: catColor, borderRadius: '8px 8px 0 0' }} />

      <CardContent sx={{ flex: 1, pb: 0 }}>
        {/* Header row: category + featured badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Chip
            label={template.category.toUpperCase()}
            size="small"
            sx={{
              background: `${catColor}18`,
              color: catColor,
              fontWeight: 700,
              fontSize: 10,
              height: 20,
            }}
          />
          {template.featured && (
            <Chip
              icon={<StarIcon sx={{ fontSize: '12px !important' }} />}
              label="Featured"
              size="small"
              color="warning"
              variant="outlined"
              sx={{ fontSize: 10, height: 20 }}
            />
          )}
          {template.installedByTenant && (
            <Chip
              icon={<CheckCircleIcon sx={{ fontSize: '12px !important' }} />}
              label="Installed"
              size="small"
              color="success"
              variant="outlined"
              sx={{ fontSize: 10, height: 20, ml: 'auto' }}
            />
          )}
        </Box>

        {/* Name */}
        <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ lineHeight: 1.3 }}>
          {template.name}
        </Typography>

        {/* Short description */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 1.5,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.5,
            minHeight: 42,
          }}
        >
          {template.shortDesc}
        </Typography>

        {/* Tags */}
        {template.tags?.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
            {template.tags.slice(0, 3).map(tag => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                variant="outlined"
                sx={{ fontSize: 10, height: 18 }}
              />
            ))}
          </Box>
        )}

        {/* Footer: publisher + stats */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 'auto' }}>
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1, isTruncated: true }}>
            by {template.publisherName ?? 'Community'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <DownloadIcon sx={{ fontSize: 13, color: '#9e9e9e' }} />
            <Typography variant="caption" color="text.secondary">
              {template.installCount.toLocaleString()}
            </Typography>
          </Box>

          {rating && (
            <Tooltip title={`${template.ratingCount} ratings`}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                <StarIcon sx={{ fontSize: 13, color: '#F59E0B' }} />
                <Typography variant="caption" color="text.secondary">{rating}</Typography>
              </Box>
            </Tooltip>
          )}

          {template.latestSemver && (
            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#9e9e9e', fontSize: 10 }}>
              v{template.latestSemver}
            </Typography>
          )}
        </Box>
      </CardContent>

      <CardActions sx={{ px: 2, py: 1.5 }}>
        <Button
          size="small"
          variant={template.installedByTenant ? 'outlined' : 'contained'}
          color="primary"
          disableElevation
          fullWidth
          onClick={e => { e.stopPropagation(); navigate(`/marketplace/${template.id}`); }}
        >
          {template.installedByTenant ? 'View Details' : 'Preview & Install'}
        </Button>
      </CardActions>
    </Card>
  );
}
