# Chess App Component Library

A comprehensive, reusable component library for the chess application with consistent styling and professional design.

## Installation

All components are exported from `src/components/ui/index.js`:

```javascript
import { PrimaryBtn, FormInput, Modal, StatCard } from '../components/ui';
```

## Components

### Buttons

#### PrimaryBtn
Green background button for primary actions.
```jsx
<PrimaryBtn onClick={handleClick}>Save Changes</PrimaryBtn>
```

#### SecondaryBtn
Transparent button with green border for secondary actions.
```jsx
<SecondaryBtn onClick={handleClick}>Cancel</SecondaryBtn>
```

#### DangerBtn
Red button for destructive actions.
```jsx
<DangerBtn onClick={handleDelete}>Delete Account</DangerBtn>
```

#### GhostBtn
Minimal button for subtle actions.
```jsx
<GhostBtn onClick={handleClick}>Learn More</GhostBtn>
```

### Form Inputs

#### FormInput
Standard form input with dark theme styling.
```jsx
<FormInput
  label="Email"
  type="email"
  placeholder="Enter your email"
  error={errors.email}
/>
```

#### PasswordInput
Password input with show/hide toggle.
```jsx
<PasswordInput
  label="Password"
  placeholder="Enter password"
  error={errors.password}
/>
```

#### FormTextarea
Multi-line text input.
```jsx
<FormTextarea
  label="Bio"
  placeholder="Tell us about yourself"
  error={errors.bio}
/>
```

### Cards

#### StatCard
Display statistics with icon, value, and optional delta.
```jsx
<StatCard
  icon="📊"
  value="1200"
  label="Current Rating"
  delta="+12"
  deltaType="positive"
/>
```

#### GameCard
Display game information in a clickable row format.
```jsx
<GameCard
  opponent="Player123"
  result="win"
  timeControl="3+0"
  moves={24}
  date="2024-01-15"
  onClick={handleGameClick}
/>
```

#### PlayerCard
Display player information with avatar and rating.
```jsx
<PlayerCard
  name="ChessMaster"
  rating={1500}
  isOnline={true}
/>
```

### Modal

#### Modal
Base modal with backdrop blur and close button.
```jsx
<Modal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  title="Settings"
>
  <div>Modal content here</div>
</Modal>
```

#### GameOverModal
Specialized modal for game end scenarios.
```jsx
<GameOverModal
  isOpen={showGameOver}
  onClose={handleClose}
  result="win"
  opponent="AI"
  newRating={1220}
  ratingChange={+20}
  onNewGame={handleNewGame}
  onRematch={handleRematch}
/>
```

#### DrawOfferModal
Modal for handling draw offers.
```jsx
<DrawOfferModal
  isOpen={showDrawOffer}
  onClose={handleClose}
  opponent="Player123"
  onAccept={handleAcceptDraw}
  onDecline={handleDeclineDraw}
/>
```

### Navigation

#### SidebarLink
Navigation link for sidebar with active states.
```jsx
<SidebarLink
  icon="🏠"
  label="Dashboard"
  isActive={currentPage === 'dashboard'}
  isCollapsed={sidebarCollapsed}
  onClick={() => setCurrentPage('dashboard')}
/>
```

#### TabBar
Horizontal tab navigation with underline indicator.
```jsx
<TabBar
  tabs={[
    { id: 'account', label: 'Account' },
    { id: 'settings', label: 'Settings' }
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

#### Breadcrumb
Breadcrumb navigation component.
```jsx
<Breadcrumb
  items={[
    { id: 'home', label: 'Home' },
    { id: 'games', label: 'Games' },
    { id: 'current', label: 'Live Game' }
  ]}
  onItemClick={handleBreadcrumbClick}
/>
```

## Design System

### Colors
- **Primary Green**: `#81b64c`
- **Background Dark**: `#0e0e0e`
- **Card Background**: `#1a1a1a`
- **Border**: `#2a2a2a`
- **Text Primary**: `#e0e0e0`
- **Text Secondary**: `#7a7a7a`

### Typography
- **Headings**: Montserrat
- **Body Text**: Inter

### Spacing
- Consistent 4px grid system
- Standard padding: `p-4`, `p-6`
- Border radius: `rounded-lg`

### States
- Hover effects with color transitions
- Active states with scale transforms (`active:scale-95`)
- Disabled states with opacity and cursor changes

## Customization

All components accept a `className` prop for additional styling:

```jsx
<PrimaryBtn className="w-full md:w-auto">Custom Button</PrimaryBtn>
```

## Integration Examples

### Dashboard Stats
```jsx
<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
  <StatCard icon="📊" value="1200" label="Rating" delta="+12" deltaType="positive" />
  <StatCard icon="🎯" value="75%" label="Win Rate" />
  <StatCard icon="🎮" value="42" label="Games Played" />
  <StatCard icon="🔥" value="5" label="Win Streak" />
</div>
```

### Settings Form
```jsx
<form className="space-y-6">
  <FormInput label="Username" placeholder="Enter username" />
  <FormInput label="Email" type="email" placeholder="Enter email" />
  <PasswordInput label="Password" placeholder="Enter password" />
  <PrimaryBtn type="submit">Save Changes</PrimaryBtn>
</form>
```

### Game Results
```jsx
<div className="space-y-3">
  {games.map(game => (
    <GameCard
      key={game.id}
      opponent={game.opponent}
      result={game.result}
      timeControl={game.timeControl}
      moves={game.moves}
      date={game.date}
      onClick={() => viewGame(game.id)}
    />
  ))}
</div>
```