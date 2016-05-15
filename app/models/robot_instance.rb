class RobotInstance < ActiveRecord::Base
	belongs_to :org
	has_many :robot_instance_sessions

	before_create :set_name_if_blank

	validates :org, presence: true

	private

		def set_name_if_blank
			robot_name = (launch_command=='unknown') ? 'Robot' : launch_command_to_human_title
			hardware_config = master_key_to_human_title
			self.name ||= "#{robot_name} on #{hardware_config}"
		end

		def launch_command_to_human_title
			launch_command.to_s.humanize
		end

		def master_key_to_human_title
			master_key.to_s.humanize
		end

end
