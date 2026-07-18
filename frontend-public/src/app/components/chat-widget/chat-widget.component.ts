import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { AuthService } from '../../services/auth.service';
import { User, RealtimeChannel } from '@supabase/supabase-js';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-widget.component.html',
  styleUrls: ['./chat-widget.component.css']
})
export class ChatWidgetComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  @Output() openAuth = new EventEmitter<void>();

  isOpen = false;
  hasAcceptedPolicy = false;
  policyTabActive = false;
  
  currentUser: User | null = null;
  isAdmin = false;
  isBanned = false;
  banReason = '';
  banUntil: string | null = null;

  messages: any[] = [];
  newMessage = '';
  
  // Moderation popup properties
  showBanModal = false;
  userToBan: { id: string; name: string; messageId: string } | null = null;
  banDuration = '24h';
  banReasonInput = '';

  private authSub!: Subscription;
  private chatChannel!: RealtimeChannel;
  private banChannel!: RealtimeChannel;
  private shouldScroll = false;

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Load policy acceptance state from localStorage
    this.hasAcceptedPolicy = localStorage.getItem('arandu_chat_policy_accepted') === 'true';

    // Subscribe to auth updates
    this.authSub = this.authService.currentUser$.subscribe(async user => {
      this.currentUser = user ?? null;
      if (this.currentUser) {
        // Check admin role
        const email = this.currentUser.email || '';
        this.isAdmin = this.currentUser.user_metadata?.['is_admin'] === true || 
                       email === 'admin@arandu.ch' || 
                       email === 'ruben@example.com';
        await this.checkIfBanned();
      } else {
        this.isAdmin = false;
        this.isBanned = false;
      }
    });

    this.subscribeChannels();
  }

  ngOnDestroy() {
    if (this.authSub) this.authSub.unsubscribe();
    this.unsubscribeChannels();
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.loadMessages();
      this.shouldScroll = true;
      if (this.currentUser) {
        this.checkIfBanned();
      }
    }
  }

  acceptPolicy() {
    this.hasAcceptedPolicy = true;
    localStorage.setItem('arandu_chat_policy_accepted', 'true');
    this.shouldScroll = true;
  }

  togglePolicyTab(show: boolean) {
    this.policyTabActive = show;
    if (!show) {
      this.shouldScroll = true;
    }
  }

  async loadMessages() {
    try {
      const { data, error } = await this.supabaseService.client
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(60);

      if (error) throw error;
      this.messages = data || [];
      this.shouldScroll = true;
    } catch (err) {
      console.error('Error loading chat messages:', err);
    }
  }

  async checkIfBanned() {
    if (!this.currentUser) return;
    try {
      const { data, error } = await this.supabaseService.client
        .from('banned_users')
        .select('*')
        .eq('id', this.currentUser.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const now = new Date();
        const until = data.banned_until ? new Date(data.banned_until) : null;
        
        if (until === null || until > now) {
          this.isBanned = true;
          this.banReason = data.reason || 'Sin motivo especificado';
          this.banUntil = until ? until.toLocaleString() : 'Permanente';
        } else {
          // Ban expired, lift it from database automatically or locally
          this.isBanned = false;
        }
      } else {
        this.isBanned = false;
      }
    } catch (err) {
      console.error('Error checking ban status:', err);
    }
  }

  subscribeChannels() {
    // 1. Messages Realtime Channel
    this.chatChannel = this.supabaseService.client
      .channel('chat_room')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      }, (payload: any) => {
        // Prevent duplicate messages if already loaded
        if (!this.messages.some(m => m.id === payload.new.id)) {
          this.messages.push(payload.new);
          this.shouldScroll = true;
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'chat_messages'
      }, (payload: any) => {
        this.messages = this.messages.filter(m => m.id !== payload.old.id);
      })
      .subscribe();

    // 2. Bans Realtime Channel
    this.banChannel = this.supabaseService.client
      .channel('ban_room')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'banned_users'
      }, () => {
        this.checkIfBanned();
      })
      .subscribe();
  }

  unsubscribeChannels() {
    if (this.chatChannel) this.supabaseService.client.removeChannel(this.chatChannel);
    if (this.banChannel) this.supabaseService.client.removeChannel(this.banChannel);
  }

  scrollToBottom() {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }

  async sendMessage() {
    if (!this.newMessage.trim() || !this.currentUser || this.isBanned) return;

    const contentToSend = this.newMessage.trim();
    this.newMessage = '';

    try {
      const { error } = await this.supabaseService.client
        .from('chat_messages')
        .insert({
          sender_id: this.currentUser.id,
          sender_name: this.currentUser.user_metadata?.['full_name'] || 'Usuario de Arandu',
          content: contentToSend
        });

      if (error) {
        if (error.message.includes('banned_users')) {
          this.isBanned = true;
          this.checkIfBanned();
        } else {
          console.error('Error sending message:', error);
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  }

  // --- MODERATION ACTIONS ---

  async deleteMessage(messageId: string) {
    if (!this.isAdmin) return;
    try {
      const { error } = await this.supabaseService.client
        .from('chat_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  }

  previousBansCount = 0;

  async openBanDialog(userId: string, userName: string, messageId: string, event: Event) {
    event.stopPropagation();
    if (!this.isAdmin) return;
    this.userToBan = { id: userId, name: userName, messageId };
    this.banReasonInput = '';
    this.banDuration = '24h';
    this.previousBansCount = 0;
    this.showBanModal = true;

    try {
      const { count, error } = await this.supabaseService.client
        .from('ban_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (!error) {
        this.previousBansCount = count || 0;
        if (this.previousBansCount >= 2) {
          this.banDuration = '1h';
        }
      }
    } catch (err) {
      console.error('Error loading ban history:', err);
    }
  }

  closeBanDialog() {
    this.showBanModal = false;
    this.userToBan = null;
  }

  async applyBan() {
    if (!this.isAdmin || !this.userToBan) return;

    let bansCount = this.previousBansCount;
    try {
      const { count } = await this.supabaseService.client
        .from('ban_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', this.userToBan.id);
      bansCount = count || 0;
    } catch (e) {}

    const isThirdOrMore = bansCount >= 2;
    const duration = isThirdOrMore ? '1h' : this.banDuration;

    const now = new Date();
    let untilDate: Date | null = null;

    if (duration === '1h') {
      untilDate = new Date(now.getTime() + 60 * 60 * 1000);
    } else if (duration === '24h') {
      untilDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else if (duration === '7d') {
      untilDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    try {
      // 1. Upsert active ban
      const { error: banError } = await this.supabaseService.client
        .from('banned_users')
        .upsert({
          id: this.userToBan.id,
          banned_by: this.currentUser?.id,
          reason: this.banReasonInput || 'Infracción de las reglas de moderación',
          banned_until: untilDate ? untilDate.toISOString() : null
        });

      if (banError) throw banError;

      // 2. Insert into ban history logs
      await this.supabaseService.client
        .from('ban_history')
        .insert({
          user_id: this.userToBan.id,
          banned_by: this.currentUser?.id,
          reason: this.banReasonInput || `Baneo #${bansCount + 1} (${duration})`,
          banned_until: untilDate ? untilDate.toISOString() : null
        });

      // 3. Delete offensive message
      await this.deleteMessage(this.userToBan.messageId);

      this.closeBanDialog();
    } catch (err) {
      console.error('Error applying user ban:', err);
    }
  }

  triggerAuth() {
    this.isOpen = false;
    this.openAuth.emit();
  }
}
