-- Triggers to auto-create notifications for likes, comments, recasts, follows, and dm messages
-- WARNING: review and adapt to avoid duplicate notifications or unwanted behavior

-- Function for like -> notify post owner
create function notify_on_like() returns trigger language plpgsql as $$
begin
  -- Only create notification if owner exists and liker is not the owner
  insert into notifications(user_id, actor_id, type, reference_id, data)
  select p.user_id, NEW.user_id, 'like', NEW.target_id, jsonb_build_object('target_type', NEW.target_type)
  from posts p where p.id = NEW.target_id and p.user_id != NEW.user_id;
  return NEW;
end;
$$;

drop trigger if exists trg_like_notify on likes;
create trigger trg_like_notify after insert on likes for each row execute procedure notify_on_like();

-- Function for comment -> notify post owner
create function notify_on_comment() returns trigger language plpgsql as $$
begin
  insert into notifications(user_id, actor_id, type, reference_id, data)
  select p.user_id, NEW.user_id, 'comment', NEW.post_id, jsonb_build_object('comment_id', NEW.id)
  from posts p where p.id = NEW.post_id and p.user_id != NEW.user_id;
  return NEW;
end;
$$;

drop trigger if exists trg_comment_notify on comments;
create trigger trg_comment_notify after insert on comments for each row execute procedure notify_on_comment();

-- Function for recast -> notify post owner
create function notify_on_recast() returns trigger language plpgsql as $$
begin
  insert into notifications(user_id, actor_id, type, reference_id, data)
  select p.user_id, NEW.user_id, 'recast', NEW.post_id, jsonb_build_object('recast_id', NEW.id)
  from posts p where p.id = NEW.post_id and p.user_id != NEW.user_id;
  return NEW;
end;
$$;

drop trigger if exists trg_recast_notify on recasts;
create trigger trg_recast_notify after insert on recasts for each row execute procedure notify_on_recast();

-- Function for follow -> notify the followed user
create function notify_on_follow() returns trigger language plpgsql as $$
begin
  insert into notifications(user_id, actor_id, type, reference_id, data)
  values (NEW.following_id, NEW.follower_id, 'follow', NEW.id, jsonb_build_object('follower_id', NEW.follower_id));
  return NEW;
end;
$$;

drop trigger if exists trg_follow_notify on follows;
create trigger trg_follow_notify after insert on follows for each row execute procedure notify_on_follow();

-- Function for dm_message -> notify conversation participants (excluding sender) or recipient
create function notify_on_dm() returns trigger language plpgsql as $$
declare
  recipient uuid;
begin
  -- notify all participants except sender
  insert into notifications(user_id, actor_id, type, reference_id, data)
  select dp.user_id, NEW.sender_id, 'dm', NEW.conversation_id, jsonb_build_object('message_id', NEW.id)
  from dm_participants dp where dp.conversation_id = NEW.conversation_id and dp.user_id != NEW.sender_id;
  return NEW;
end;
$$;

drop trigger if exists trg_dm_notify on dm_messages;
create trigger trg_dm_notify after insert on dm_messages for each row execute procedure notify_on_dm();
