class RobotInstanceSession < ActiveRecord::Base
	belongs_to :robot_instance
	has_many :agent_sessions

	before_create :generate_token

	def open_agent_sessions
		agent_sessions.where('end_time IS NULL')		
	end

	def stop
		update_attribute :end_session, Time.zone.now
	end

	private

		def generate_token
			self.session_token = generate_secure_token_string
		end

		def generate_secure_token_string
		    SecureRandom.urlsafe_base64(25).tr('lIO0', 'sxyz')
  		end

end
