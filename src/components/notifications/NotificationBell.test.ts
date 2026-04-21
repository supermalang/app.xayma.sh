import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

// Mock useNotifications before importing component
const mockUnreadCount = ref(0)
vi.mock('@/composables/useNotifications', () => ({
  useNotifications: () => ({
    unreadCount: mockUnreadCount,
    notifications: ref([]),
    readNotification: vi.fn(),
    readAll: vi.fn(),
    removeNotification: vi.fn(),
    fetchNotifications: vi.fn(),
    fetchUnreadCount: vi.fn(),
    initialize: vi.fn(),
    subscribeToUpdates: vi.fn(),
    unsubscribe: vi.fn(),
    loading: ref(false),
    error: ref(null),
    unreadNotifications: ref([]),
    groupedByDate: ref({}),
  }),
}))

vi.mock('./NotificationFeed.vue', () => ({
  default: {
    name: 'NotificationFeed',
    template: '<div data-testid="feed-stub" />',
    methods: { toggle: vi.fn() },
  },
}))

import NotificationBell from './NotificationBell.vue'

describe('NotificationBell', () => {
  beforeEach(() => {
    mockUnreadCount.value = 0
  })

  it('renders the bell icon', () => {
    const wrapper = mount(NotificationBell)
    expect(wrapper.find('.pi-bell').exists()).toBe(true)
  })

  it('passes undefined to OverlayBadge value when unread count is 0 (no badge shown)', () => {
    const wrapper = mount(NotificationBell)
    const badge = wrapper.findComponent({ name: 'OverlayBadge' })
    expect(badge.props('value')).toBeNull()
  })

  it('passes unread count to OverlayBadge when count > 0', async () => {
    mockUnreadCount.value = 3
    const wrapper = mount(NotificationBell)
    await wrapper.vm.$nextTick()
    const badge = wrapper.findComponent({ name: 'OverlayBadge' })
    expect(badge.props('value')).toBe(3)
  })

  it('updates badge reactively when unread count increases', async () => {
    const wrapper = mount(NotificationBell)
    expect(wrapper.findComponent({ name: 'OverlayBadge' }).props('value')).toBeNull()

    mockUnreadCount.value = 5
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent({ name: 'OverlayBadge' }).props('value')).toBe(5)
  })

  it('badge becomes undefined again when unread count drops to 0', async () => {
    mockUnreadCount.value = 2
    const wrapper = mount(NotificationBell)
    await wrapper.vm.$nextTick()

    mockUnreadCount.value = 0
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent({ name: 'OverlayBadge' }).props('value')).toBeNull()
  })
})
