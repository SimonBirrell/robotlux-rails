class User < ActiveRecord::Base
  belongs_to :org

  enum role: [:user, :admin, :org_admin, :agent]
  after_initialize :set_default_role, :if => :new_record?

  # http://soryy.com/blog/2014/apis-with-devise/
  before_save :ensure_authentication_token!

  scope :no_agents, -> { where('role <> ?', User.roles[:agent]) }

  def admin?
    self.role == 'admin'
  end

  def org_admin?
    self.role == 'org_admin'
  end

  def agent?
    self.role == 'agent'
  end

  def logon(params)
    if !agent? 
      new_auth_token = reset_authentication_token!
      update_attribute :authentication_token, new_auth_token
      auth_data = {
         "email" => email,
         "name" => name,
         "org_slug" => org.slug
      }
      LuxserverInterface.set_browser_details(authentication_token, auth_data)
    end
  end

  def reset_authentication_token_and_save
    token = reset_authentication_token!
    update_attribute :authentication_token, token
    save!
  end

  def set_default_role
    self.role ||= :user
  end

  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable and :omniauthable
  devise :invitable, :database_authenticatable, :registerable, :confirmable,
         :recoverable, :rememberable, :trackable, :validatable


  # API Authentication
  # http://soryy.com/blog/2014/apis-with-devise/

  def generate_secure_token_string
    SecureRandom.urlsafe_base64(25).tr('lIO0', 'sxyz')
  end

  # Sarbanes-Oxley Compliance: http://en.wikipedia.org/wiki/Sarbanes%E2%80%93Oxley_Act
  def password_complexity
    if password.present? and not password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W]).+/)
      errors.add :password, "must include at least one of each: lowercase letter, uppercase letter, numeric digit, special character."
    end
  end

  def password_presence
    password.present? && password_confirmation.present?
  end

  def password_match
    password == password_confirmation
  end

  def ensure_authentication_token!
    if authentication_token.blank?
      self.authentication_token = generate_authentication_token
    end
  end

  def generate_authentication_token
    loop do
      token = generate_secure_token_string
      break token unless User.where(authentication_token: token).first
    end
  end

  def reset_authentication_token!
    self.authentication_token = generate_authentication_token
  end

end
